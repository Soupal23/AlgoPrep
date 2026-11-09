import { Workspace } from '../models/Workspace.js';
import { Material } from '../models/Material.js';
import { Chunk } from '../models/Chunk.js';
import { Roadmap } from '../models/Roadmap.js';
import { Day } from '../models/Day.js';
import { retriever } from '../ai/retriever.js';
import { llmGateway } from '../ai/llmGateway.js';
import { PROMPTS } from '../ai/prompts/index.js';
import { topicsExtractionSchema } from '../ai/schemas/index.js';
import { topologicalSortTopics, scheduleDays } from '../utils/roadmapScheduler.js';
import { updateJobProgress, completeJob, failJob } from './jobService.js';
import logger from '../utils/logger.js';

/**
 * Generates an end-to-end grounded day-wise study roadmap for a student workspace.
 */
export const generateRoadmap = async ({
  workspaceId,
  userId,
  settings = {},
  jobId = null
}) => {
  const startTime = Date.now();
  logger.info({ workspaceId, userId, jobId }, 'Starting roadmap generation pipeline');

  try {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    // Check existing roadmap and regeneration count
    let existingRoadmap = await Roadmap.findOne({ workspaceId, ownerId: userId });
    if (existingRoadmap && existingRoadmap.regenerateCount >= 3) {
      const err = new Error('Maximum revision plan regenerations (3) exceeded for this workspace');
      err.statusCode = 400;
      throw err;
    }

    if (jobId) {
      await updateJobProgress(jobId, {
        progress: 10,
        stage: 'Analyzing workspace study materials and syllabus'
      });
    }

    // 1. Gather context from syllabus and uploaded chunks
    const syllabusMaterial = await Material.findOne({
      workspaceId,
      kind: 'syllabus',
      status: 'ready'
    });

    let contextText = '';
    if (syllabusMaterial) {
      const syllabusChunks = await Chunk.find({ materialId: syllabusMaterial._id })
        .sort({ 'location.page': 1 })
        .limit(15)
        .lean();
      contextText = syllabusChunks.map(c => c.text).join('\n\n');
    }

    // If no dedicated syllabus, gather sample chunks from all materials
    if (!contextText || contextText.length < 50) {
      const generalChunks = await Chunk.find({ workspaceId }).limit(10).lean();
      if (generalChunks.length > 0) {
        contextText = generalChunks.map(c => c.text).join('\n\n');
      }
    }

    // Fallback if workspace has no uploaded materials yet
    if (!contextText || contextText.length < 30) {
      contextText = `Subject: ${workspace.subject}\nTitle: ${workspace.title}\nDescription: ${workspace.description || 'Comprehensive curriculum preparation'}`;
    }

    // 2. Extract topics via LLM Gateway
    if (jobId) {
      await updateJobProgress(jobId, {
        progress: 30,
        stage: 'Extracting core topics and learning outcomes'
      });
    }

    const level = settings.level || 'intermediate';
    let extractedTopics = [];

    try {
      const promptObj = PROMPTS['roadmap.extractTopics.v1'];
      const response = await llmGateway.generateObject({
        task: 'roadmap_topic_extraction',
        prompt: promptObj.template({ syllabusText: contextText.slice(0, 8000), level }),
        systemPrompt: promptObj.system,
        schema: topicsExtractionSchema,
        modelTier: 'default',
        temperature: 0.2
      });

      const topics = response?.data?.topics || response?.object?.topics;
      if (Array.isArray(topics) && topics.length > 0) {
        extractedTopics = topics;
      }
    } catch (llmErr) {
      logger.warn(
        { err: llmErr.message, workspaceId },
        'LLM topic extraction encountered error, falling back to heuristic topic extraction'
      );

      // Resilient heuristic extraction from context
      const lines = contextText
        .split('\n')
        .map(l => l.trim().replace(/^[#\-*0-9.]+\s*/, ''))
        .filter(l => l.length > 8 && l.length < 80);

      const uniqueHeaders = Array.from(new Set(lines)).slice(0, 6);
      if (uniqueHeaders.length > 0) {
        extractedTopics = uniqueHeaders.map((header, idx) => ({
          key: `topic-${idx + 1}-${header.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20)}`,
          title: header,
          description: `Key principles and applications of ${header}`,
          difficulty: idx % 2 === 0 ? 'medium' : 'hard',
          estMinutes: 60,
          prerequisites: idx > 0 ? [`topic-${idx}-${uniqueHeaders[idx - 1].toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20)}`] : []
        }));
      } else {
        extractedTopics = [
          {
            key: 'core-foundations',
            title: `${workspace.subject} Foundations`,
            description: `Core theories and principles of ${workspace.title}`,
            difficulty: 'easy',
            estMinutes: 60,
            prerequisites: []
          },
          {
            key: 'advanced-analysis',
            title: `${workspace.subject} Advanced Applications`,
            description: `Practical problem-solving and in-depth methodologies in ${workspace.title}`,
            difficulty: 'hard',
            estMinutes: 90,
            prerequisites: ['core-foundations']
          }
        ];
      }
    }

    // 3. Ground each topic with vector retrieval
    if (jobId) {
      await updateJobProgress(jobId, {
        progress: 55,
        stage: 'Grounding topics against ingested notes and slides'
      });
    }

    const groundedTopics = [];
    for (const topic of extractedTopics) {
      try {
        const matchingChunks = await retriever.retrieve({
          workspaceId,
          query: `${topic.title} ${topic.description}`,
          k: 3
        });

        const sourceChunkIds = (matchingChunks || []).map(c => c._id);
        groundedTopics.push({
          ...topic,
          sourceChunkIds,
          isExternal: sourceChunkIds.length === 0
        });
      } catch (retrievalErr) {
        groundedTopics.push({
          ...topic,
          sourceChunkIds: [],
          isExternal: true
        });
      }
    }

    // 4. Resolve topic dependencies via Topological Sort
    if (jobId) {
      await updateJobProgress(jobId, {
        progress: 75,
        stage: 'Resolving topic dependencies and pedagogical ordering'
      });
    }

    const sortedTopics = topologicalSortTopics(groundedTopics);

    // 5. Deterministically schedule topics into days
    if (jobId) {
      await updateJobProgress(jobId, {
        progress: 88,
        stage: 'Structuring day-by-day learning schedule'
      });
    }

    const totalDays = Number(settings.days) || 7;
    const hoursPerDay = Number(settings.hoursPerDay) || 2;
    const rawDays = scheduleDays({
      topics: sortedTopics,
      totalDays,
      hoursPerDay
    });

    // 6. Persist Roadmap and Days in DB
    const roadmapData = {
      workspaceId,
      ownerId: userId,
      status: 'ready',
      settings: {
        days: totalDays,
        hoursPerDay,
        examDate: settings.examDate ? new Date(settings.examDate) : workspace.examDate,
        level
      },
      topics: sortedTopics,
      generation: {
        promptVersions: { extractTopics: '1.0.0', schedule: '1.0.0' },
        latencyMs: Date.now() - startTime
      }
    };

    let roadmap;
    if (existingRoadmap) {
      existingRoadmap.version = (existingRoadmap.version || 1) + 1;
      existingRoadmap.regenerateCount = (existingRoadmap.regenerateCount || 0) + 1;
      existingRoadmap.status = 'ready';
      existingRoadmap.settings = roadmapData.settings;
      existingRoadmap.topics = roadmapData.topics;
      existingRoadmap.generation = roadmapData.generation;
      roadmap = await existingRoadmap.save();

      // Clear previous days
      await Day.deleteMany({ roadmapId: roadmap._id });
    } else {
      roadmap = await Roadmap.create(roadmapData);
    }

    const dayDocs = rawDays.map(day => ({
      ...day,
      roadmapId: roadmap._id,
      workspaceId,
      ownerId: userId
    }));

    const insertedDays = await Day.insertMany(dayDocs);

    // 7. Complete Background Job
    if (jobId) {
      await completeJob(jobId, {
        roadmapId: roadmap._id,
        daysCount: insertedDays.length,
        topicsCount: sortedTopics.length
      });
    }

    logger.info(
      { roadmapId: roadmap._id, daysCount: insertedDays.length, topicsCount: sortedTopics.length },
      'Roadmap generation pipeline completed successfully'
    );

    return {
      success: true,
      roadmap,
      days: insertedDays
    };
  } catch (error) {
    logger.error({ workspaceId, err: error.message }, 'Roadmap generation failed');

    if (jobId) {
      await failJob(jobId, error).catch(() => {});
    }

    throw error;
  }
};

/**
 * Fetches the active roadmap and its associated day timeline for a workspace.
 */
export const getRoadmapByWorkspace = async (workspaceId, userId) => {
  const roadmap = await Roadmap.findOne({ workspaceId, ownerId: userId }).lean();
  if (!roadmap) {
    return null;
  }

  const days = await Day.find({ roadmapId: roadmap._id })
    .sort({ dayNumber: 1 })
    .lean();

  return {
    ...roadmap,
    days
  };
};

/**
 * Updates a day's status and automatically unlocks the next day upon completion.
 */
export const updateDayStatus = async (dayId, userId, newStatus) => {
  const day = await Day.findOne({ _id: dayId, ownerId: userId });
  if (!day) {
    const error = new Error('Day not found or access denied');
    error.statusCode = 404;
    throw error;
  }

  day.status = newStatus;
  await day.save();

  // If completed, automatically unlock the next sequential day
  if (newStatus === 'completed') {
    const nextDay = await Day.findOne({
      roadmapId: day.roadmapId,
      dayNumber: day.dayNumber + 1
    });

    if (nextDay && nextDay.status === 'locked') {
      nextDay.status = 'available';
      await nextDay.save();
      logger.info({ roadmapId: day.roadmapId, unlockedDay: nextDay.dayNumber }, 'Unlocked next day');
    }
  }

  return day;
};
