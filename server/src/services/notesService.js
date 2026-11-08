import { Day } from '../models/Day.js';
import { Roadmap } from '../models/Roadmap.js';
import { Notes } from '../models/Notes.js';
import { Material } from '../models/Material.js';
import { retriever } from '../ai/retriever.js';
import { llmGateway } from '../ai/llmGateway.js';
import { PROMPTS, getPrompt } from '../ai/prompts/index.js';
import { updateJobProgress, completeJob, failJob } from './jobService.js';
import logger from '../utils/logger.js';

/**
 * Retrieves existing generated notes for a day if available.
 */
export const getNotesByDayId = async (dayId, userId) => {
  const notes = await Notes.findOne({ dayId }).lean();
  if (!notes) return null;

  if (notes.ownerId.toString() !== userId.toString()) {
    const error = new Error('Forbidden: You do not own these study notes');
    error.statusCode = 403;
    throw error;
  }

  return notes;
};

/**
 * Builds grounded fallback notes for a topic when LLM generation fails or times out.
 */
function buildFallbackSection({ topic, contextPassages, citationMap }) {
  const citedTags = Object.keys(citationMap);
  const citationList = citedTags.map(tag => citationMap[tag]);

  const passageSnippets = contextPassages.map((p, idx) => {
    return `> **[C${idx + 1}]** *${p.source}*\n> "${p.text.slice(0, 300).trim()}..."`;
  }).join('\n\n');

  const markdown = `## ${topic.title}

### 1. Intuition & Overview
${topic.description || `Core conceptual study of ${topic.title}.`}
${citedTags.length > 0 ? ` This section is derived directly from your course materials ${citedTags.map(c => `[${c}]`).join(' ')}.` : ''}

### 2. Primary Study Content
${passageSnippets || 'No direct textbook passages found for this topic. Refer to course lecture recordings and recommended resources.'}

### 3. Key Theoretical & Architectural Properties
- **Topic Key:** \`${topic.key}\`
- **Difficulty:** ${topic.difficulty || 'Medium'}
- **Estimated Mastery Time:** ${topic.estMinutes || 60} minutes
${topic.prerequisites?.length > 0 ? `- **Prerequisites:** ${topic.prerequisites.join(', ')}` : ''}

### 4. Review Traps & Exam Invariants
Ensure you can derive core equations and solve standard algorithm variants without referencing notes under timed conditions.`;

  return {
    topicKey: topic.key,
    heading: topic.title,
    markdown,
    citations: citationList,
    isBeyondMaterials: contextPassages.length === 0
  };
}

/**
 * Generates comprehensive RAG notes for a day's curriculum.
 */
export const generateDayNotes = async ({
  dayId,
  userId,
  jobId = null,
  force = false
}) => {
  const startTime = Date.now();
  logger.info({ dayId, userId, jobId, force }, 'Starting day notes generation');

  const day = await Day.findById(dayId);
  if (!day) {
    const error = new Error(`Day ${dayId} not found`);
    error.statusCode = 404;
    throw error;
  }

  if (day.ownerId.toString() !== userId.toString()) {
    const error = new Error('Forbidden: You do not own this day');
    error.statusCode = 403;
    throw error;
  }

  // Check if notes already exist and force is not requested
  if (!force) {
    const existingNotes = await Notes.findOne({ dayId: day._id });
    if (existingNotes && existingNotes.status === 'ready') {
      logger.info({ dayId, notesId: existingNotes._id }, 'Returning existing day notes');
      return existingNotes;
    }
  }

  try {
    day.content.notesStatus = 'pending';
    await day.save();

    if (jobId) {
      await updateJobProgress(jobId, {
        progress: 15,
        stage: 'Identifying topics and gathering reference passages from materials'
      });
    }

    // 1. Resolve topics for this day from the Roadmap
    const roadmap = await Roadmap.findById(day.roadmapId).lean();
    const roadmapTopics = roadmap?.topics || [];

    let topicsForDay = [];
    if (day.topicKeys && day.topicKeys.length > 0) {
      topicsForDay = day.topicKeys.map((key) => {
        const found = roadmapTopics.find((t) => t.key === key);
        return (
          found || {
            key,
            title: key.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            description: `Study of ${key}`,
            difficulty: 'medium',
            estMinutes: 60
          }
        );
      });
    }

    // Fallback if day has no specific topic keys (e.g. revision or mock day)
    if (topicsForDay.length === 0) {
      topicsForDay = [
        {
          key: `day-${day.dayNumber}-synthesis`,
          title: day.title || `Day ${day.dayNumber} Synthesis`,
          description: day.objectives?.join('. ') || 'Comprehensive synthesis of preceding concepts',
          difficulty: 'medium',
          estMinutes: day.estMinutes || 90
        }
      ];
    }

    // 2. Fetch Material names map for clean citations
    const materials = await Material.find({ workspaceId: day.workspaceId }).select('_id fileName').lean();
    const materialMap = new Map();
    materials.forEach((m) => materialMap.set(m._id.toString(), m.fileName));

    // 3. Generate grounded section for each topic
    const sections = [];
    const totalTopics = topicsForDay.length;

    for (let i = 0; i < totalTopics; i++) {
      const topic = topicsForDay[i];
      if (jobId) {
        const stepPct = Math.round(20 + ((i + 1) / totalTopics) * 50);
        await updateJobProgress(jobId, {
          progress: stepPct,
          stage: `Generating grounded notes for "${topic.title}" (${i + 1}/${totalTopics})`
        });
      }

      // Hybrid Retrieval for topic
      let retrievedPassages = [];
      try {
        retrievedPassages = await retriever.retrieve({
          workspaceId: day.workspaceId.toString(),
          query: topic.title,
          k: 5
        });

        if (retrievedPassages.length < 2 && topic.description) {
          const extraPassages = await retriever.retrieve({
            workspaceId: day.workspaceId.toString(),
            query: topic.description,
            k: 3
          });
          const existingIds = new Set(retrievedPassages.map((p) => p._id.toString()));
          for (const extra of extraPassages) {
            if (!existingIds.has(extra._id.toString())) {
              retrievedPassages.push(extra);
            }
          }
        }
      } catch (retrieveErr) {
        logger.warn({ err: retrieveErr.message, topic: topic.key }, 'Context retrieval encountered an error');
      }

      // Build citation map: [C1] -> chunk info
      const citationMap = {};
      const contextPassages = retrievedPassages.map((chunk, idx) => {
        const cId = `C${idx + 1}`;
        const matName = materialMap.get(chunk.materialId?.toString()) || 'Course Material';
        const locParts = [];
        if (chunk.location?.page) locParts.push(`Page ${chunk.location.page}`);
        if (chunk.location?.slide) locParts.push(`Slide ${chunk.location.slide}`);
        if (chunk.location?.heading) locParts.push(chunk.location.heading);
        const source = `${matName}${locParts.length > 0 ? ` (${locParts.join(', ')})` : ''}`;

        citationMap[cId] = {
          citationId: cId,
          chunkId: chunk._id,
          materialName: matName,
          location: chunk.location || {},
          snippet: (chunk.text || '').slice(0, 180).trim()
        };

        return {
          cId,
          source,
          text: chunk.text
        };
      });

      // Call LLM for grounded section
      let sectionMarkdown = '';
      let isBeyondMaterials = contextPassages.length === 0;

      try {
        const promptObj = getPrompt('notes.section.v1', {
          topicTitle: topic.title,
          topicDescription: topic.description,
          contextPassages
        });

        const llmResponse = await llmGateway.generateText({
          task: 'notes_section_generation',
          prompt: promptObj.text,
          systemPrompt: promptObj.system,
          modelTier: 'default',
          temperature: 0.3
        });

        sectionMarkdown = (llmResponse.text || '')
          .replace(/\|\s*\|\s*/g, '|\n| ')
          .replace(/\n\s*\|/g, '\n|')
          .replace(/\|\s*\n/g, '|\n');
        if (sectionMarkdown.toLowerCase().includes('beyond your materials') || isBeyondMaterials) {
          isBeyondMaterials = true;
        }
      } catch (llmErr) {
        logger.warn(
          { err: llmErr.message, topicKey: topic.key },
          'LLM note section generation failed, employing structured fallback'
        );
        const fallback = buildFallbackSection({ topic, contextPassages, citationMap });
        sectionMarkdown = fallback.markdown;
        isBeyondMaterials = fallback.isBeyondMaterials;
      }

      // Verify and extract only citations actually used and present in citationMap
      const citedTags = new Set();
      const citationMatches = sectionMarkdown.matchAll(/\[C(\d+)\]/g);
      for (const match of citationMatches) {
        const tag = `C${match[1]}`;
        if (citationMap[tag]) {
          citedTags.add(tag);
        }
      }

      // Attach valid citations
      const sectionCitations = Array.from(citedTags).map((tag) => citationMap[tag]);

      sections.push({
        topicKey: topic.key,
        heading: topic.title,
        markdown: sectionMarkdown,
        citations: sectionCitations,
        isBeyondMaterials
      });
    }

    // 4. Generate Key Takeaways and Active Recall Flashcards
    if (jobId) {
      await updateJobProgress(jobId, {
        progress: 80,
        stage: 'Synthesizing key takeaways and active recall flashcards'
      });
    }

    let keyPoints = [];
    let flashcards = [];
    const combinedNotes = sections.map((s) => `## ${s.heading}\n${s.markdown}`).join('\n\n');

    try {
      const summaryPrompt = getPrompt('notes.summaryAndCards.v1', {
        dayTitle: day.title,
        combinedNotesText: combinedNotes
      });

      const summaryResponse = await llmGateway.generateObject({
        task: 'notes_summary_flashcards',
        prompt: summaryPrompt.text,
        systemPrompt: summaryPrompt.system,
        modelTier: 'default',
        temperature: 0.2
      });

      const parsed = summaryResponse?.data || summaryResponse?.object;
      if (Array.isArray(parsed?.keyPoints) && parsed.keyPoints.length > 0) {
        keyPoints = parsed.keyPoints;
      }
      if (Array.isArray(parsed?.flashcards) && parsed.flashcards.length > 0) {
        flashcards = parsed.flashcards;
      }
    } catch (summaryErr) {
      logger.warn({ err: summaryErr.message }, 'Flashcards/keyPoints generation failed, using heuristic extraction');
    }

    // Heuristic fallbacks if LLM summary failed
    if (keyPoints.length === 0) {
      keyPoints = topicsForDay.map(
        (t) => `Master ${t.title}: understand formal invariants, core algorithmic patterns, and common exam traps.`
      );
    }

    if (flashcards.length === 0) {
      flashcards = topicsForDay.map((t) => ({
        front: `What is the core intuition and application of ${t.title}?`,
        back: `${t.description || t.title}. Ensure you can state the formal invariants and time/space complexities.`
      }));
    }

    // 5. Atomically persist Notes document
    const latencyMs = Date.now() - startTime;
    const notesDoc = await Notes.findOneAndUpdate(
      { dayId: day._id },
      {
        $set: {
          dayId: day._id,
          workspaceId: day.workspaceId,
          ownerId: day.ownerId,
          sections,
          keyPoints,
          flashcards,
          status: 'ready',
          generation: {
            promptVersion: '1.1.0',
            model: 'gemini-3.8-flash',
            tokens: Math.round(combinedNotes.length / 4),
            latencyMs
          }
        }
      },
      { upsert: true, new: true }
    );

    // Update Day content status
    day.content.notesStatus = 'ready';
    await day.save();

    if (jobId) {
      await completeJob(jobId, {
        dayId: day._id,
        notesId: notesDoc._id,
        sectionCount: sections.length,
        flashcardCount: flashcards.length
      });
    }

    logger.info(
      { dayId: day._id, notesId: notesDoc._id, sections: sections.length, latencyMs },
      'Day notes generation completed successfully'
    );

    return notesDoc;
  } catch (error) {
    logger.error({ dayId, err: error.message }, 'Failed to generate day notes');
    day.content.notesStatus = 'failed';
    await day.save().catch(() => {});

    if (jobId) {
      await failJob(jobId, error).catch(() => {});
    }

    throw error;
  }
};

/**
 * Toggles notes read status and updates day progress.
 */
export const markNotesAsRead = async (dayId, userId) => {
  const notes = await Notes.findOne({ dayId });
  if (!notes) {
    const error = new Error('Notes not found for this day');
    error.statusCode = 404;
    throw error;
  }

  if (notes.ownerId.toString() !== userId.toString()) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }

  notes.readStatus = true;
  await notes.save();

  const day = await Day.findById(dayId);
  if (day && day.status === 'available') {
    day.status = 'in_progress';
    await day.save();
  }

  return { notes, day };
};
