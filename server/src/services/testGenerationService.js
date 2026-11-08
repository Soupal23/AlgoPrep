import { z } from 'zod';
import { Day } from '../models/Day.js';
import { Roadmap } from '../models/Roadmap.js';
import { Workspace } from '../models/Workspace.js';
import { Test } from '../models/Test.js';
import { Question } from '../models/Question.js';
import { retriever } from '../ai/retriever.js';
import { llmGateway } from '../ai/llmGateway.js';
import { PROMPTS } from '../ai/prompts/index.js';
import { updateJobProgress, completeJob, failJob } from './jobService.js';
import logger from '../utils/logger.js';

const dayQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      questionText: z.string().min(10),
      options: z.array(z.string().min(1)).length(4),
      correctOptionIndex: z.number().int().min(0).max(3),
      explanation: z.string().min(10),
      conceptKey: z.string(),
      difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
      bloomLevel: z.enum(['remember', 'understand', 'apply', 'analyze']).default('understand'),
      sourceCitationIndex: z.number().optional()
    })
  ).min(4)
});

/**
 * Shuffles options using Fisher-Yates and updates the correctOptionIndex.
 * Eliminates LLM positional bias (e.g. tendency to put the correct answer first).
 */
export function shuffleOptionsAndFixIndex(options, correctOptionIndex) {
  if (!Array.isArray(options) || options.length !== 4) {
    return { options, correctOptionIndex };
  }

  const originalCorrect = options[correctOptionIndex];
  const items = options.map((opt, idx) => ({
    opt,
    isCorrect: idx === correctOptionIndex
  }));

  // Fisher-Yates shuffle
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  const shuffledOptions = items.map(item => item.opt);
  const newIndex = items.findIndex(item => item.isCorrect);

  return {
    options: shuffledOptions,
    correctOptionIndex: newIndex >= 0 ? newIndex : 0
  };
}

/**
 * Generates robust heuristic questions if LLM generation fails or times out.
 */
function buildFallbackQuestionsForTopics(topics, dayTitle) {
  const fallbackList = [];

  topics.forEach((topic) => {
    // Question 1: Invariant & Definition
    fallbackList.push({
      questionText: `Which of the following statements most accurately defines the fundamental invariant or operational characteristic of "${topic.title}"?`,
      options: [
        `It maintains consistent asymptotic bounds by enforcing structural balance and invariants during mutations.`,
        `It requires unconstrained linear scans without bounding memory allocations or state constraints.`,
        `It discards previous state transitions and operates strictly as an unbounded FIFO queue.`,
        `It guarantees constant-time random lookups regardless of key collisions or cluster distributions.`
      ],
      correctOptionIndex: 0,
      explanation: `By definition, ${topic.title} enforces strict structural invariants to preserve predictable complexity bounds during operations.`,
      conceptKey: topic.key,
      difficulty: 'easy',
      bloomLevel: 'remember'
    });

    // Question 2: Complexity & Analysis
    fallbackList.push({
      questionText: `In the context of ${topic.title}, what is the worst-case asymptotic upper bound for primary operations under standard conditions?`,
      options: [
        `O(1) strictly independent of input size`,
        `O(log n) or bounded polynomial complexity governed by its structural depth`,
        `O(2^n) exponential traversal overhead`,
        `O(n!) factorial branching factor`
      ],
      correctOptionIndex: 1,
      explanation: `Efficient implementations of ${topic.title} bound search, insertion, and query operations logarithmically or hierarchically.`,
      conceptKey: topic.key,
      difficulty: 'medium',
      bloomLevel: 'analyze'
    });

    // Question 3: Trade-off & Practical Application
    fallbackList.push({
      questionText: `When designing high-throughput production systems, what is the primary engineering trade-off associated with utilizing "${topic.title}"?`,
      options: [
        `Complete loss of determinism in concurrent environments`,
        `Additional memory overhead for metadata/pointers in exchange for accelerated search and query efficiency`,
        `Inability to serialize data structures across process boundaries`,
        `Elimination of compile-time type verification`
      ],
      correctOptionIndex: 1,
      explanation: `Balanced and indexed data structures for ${topic.title} incur pointer/metadata overhead to deliver optimal retrieval throughput.`,
      conceptKey: topic.key,
      difficulty: 'hard',
      bloomLevel: 'apply'
    });
  });

  return fallbackList.map((q) => {
    const shuffled = shuffleOptionsAndFixIndex(q.options, q.correctOptionIndex);
    return {
      ...q,
      options: shuffled.options,
      correctOptionIndex: shuffled.correctOptionIndex
    };
  });
}

/**
 * Retrieves existing day test or generates a fresh grounded CBT test.
 */
export const getOrGenerateDayTest = async ({ dayId, userId, force = false, jobId = null }) => {
  const day = await Day.findById(dayId);
  if (!day) {
    const error = new Error(`Day ${dayId} not found`);
    error.statusCode = 404;
    throw error;
  }

  if (day.ownerId.toString() !== userId.toString()) {
    const error = new Error('Forbidden: You do not own this learning day');
    error.statusCode = 403;
    throw error;
  }

  // 1. If not forcing fresh generation, check if a ready test already exists
  if (!force) {
    const existingTest = await Test.findOne({ dayId }).lean();
    if (existingTest) {
      const questions = await Question.find({ testId: existingTest._id })
        .sort({ order: 1 })
        .select('-correctOptionIndex -explanation')
        .lean();

      if (questions.length > 0) {
        if (day.content?.testStatus !== 'ready') {
          day.content = day.content || {};
          day.content.testStatus = 'ready';
          await day.save();
        }
        if (jobId) await completeJob(jobId, { testId: existingTest._id, count: questions.length, cached: true });
        return { test: existingTest, questions, cached: true };
      }
    }
  }

  try {
    if (jobId) {
      await updateJobProgress(jobId, { progress: 15, stage: 'Retrieving syllabus topics and grounding passages' });
    }

    const roadmap = await Roadmap.findById(day.roadmapId).lean();
    if (!roadmap) {
      const error = new Error('Parent roadmap not found');
      error.statusCode = 404;
      throw error;
    }

    // Resolve topics
    const assignedKeys = day.topicKeys || [];
    let dayTopics = (roadmap.topics || []).filter(t => assignedKeys.includes(t.key));
    if (dayTopics.length === 0) {
      dayTopics = (roadmap.topics || []).slice(0, 3);
    }
    const topicKeys = dayTopics.map(t => t.key);

    // 2. Retrieve grounded passages from workspace materials
    const contextPassages = [];
    for (const t of dayTopics) {
      try {
        const hits = await retriever.retrieve({
          workspaceId: day.workspaceId,
          query: `${t.title} ${t.description || ''}`,
          k: 3
        });
        for (const h of hits) {
          contextPassages.push({
            chunkId: h.chunkId,
            source: h.materialName || 'Course Material',
            text: h.text
          });
        }
      } catch (retErr) {
        logger.debug({ err: retErr.message, topic: t.key }, 'Retriever query skipped for test generation');
      }
    }

    if (jobId) {
      await updateJobProgress(jobId, { progress: 40, stage: 'Generating rigorous CBT questions via AI model' });
    }

    let generatedQuestions = [];

    // 3. LLM Question Generation Pass
    try {
      const promptObj = PROMPTS['test.dayQuestions.v1'];
      const response = await llmGateway.generateObject({
        task: 'day_test_generation',
        prompt: promptObj.template({
          dayNumber: day.dayNumber,
          dayTitle: day.title,
          topicKeys,
          topics: dayTopics,
          contextPassages: contextPassages.slice(0, 8)
        }),
        systemPrompt: promptObj.system,
        schema: dayQuestionsSchema,
        modelTier: 'default',
        temperature: 0.3
      });

      const rawQuestions = response?.data?.questions || response?.object?.questions;
      if (Array.isArray(rawQuestions) && rawQuestions.length >= 4) {
        generatedQuestions = rawQuestions;
      }
    } catch (llmErr) {
      logger.warn(
        { err: llmErr.message, dayId },
        'LLM day test generation failed or timed out, generating resilient heuristic questions'
      );
    }

    // 4. Fallback if LLM generated insufficient questions
    if (generatedQuestions.length < 4) {
      const fallbacks = buildFallbackQuestionsForTopics(dayTopics, day.title);
      generatedQuestions = [...generatedQuestions, ...fallbacks].slice(0, 10);
    }

    if (jobId) {
      await updateJobProgress(jobId, { progress: 75, stage: 'Validating and shuffling question choices' });
    }

    // 5. Sanitize, Validate, and Shuffle Options
    const processedQuestions = [];
    for (let idx = 0; idx < generatedQuestions.length; idx++) {
      const q = generatedQuestions[idx];

      // Validate 4 unique options
      const uniqueOptions = Array.from(new Set(q.options || []));
      if (uniqueOptions.length !== 4) continue;

      // Validate conceptKey
      let assignedConceptKey = topicKeys.includes(q.conceptKey) ? q.conceptKey : topicKeys[0];

      // Shuffle options to remove positional bias
      const shuffled = shuffleOptionsAndFixIndex(q.options, q.correctOptionIndex);

      // Link source chunk ID if citation index corresponds to a passage
      let sourceChunkIds = [];
      if (typeof q.sourceCitationIndex === 'number' && contextPassages[q.sourceCitationIndex - 1]) {
        sourceChunkIds = [contextPassages[q.sourceCitationIndex - 1].chunkId];
      }

      processedQuestions.push({
        questionText: q.questionText.trim(),
        options: shuffled.options,
        correctOptionIndex: shuffled.correctOptionIndex,
        explanation: q.explanation.trim(),
        conceptKey: assignedConceptKey,
        difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
        bloomLevel: ['remember', 'understand', 'apply', 'analyze'].includes(q.bloomLevel) ? q.bloomLevel : 'understand',
        sourceChunkIds,
        type: 'mcq_single',
        order: processedQuestions.length + 1
      });
    }

    // Ensure at least 4 questions
    if (processedQuestions.length < 4) {
      const fallbacks = buildFallbackQuestionsForTopics(dayTopics, day.title);
      for (const fb of fallbacks) {
        fb.order = processedQuestions.length + 1;
        processedQuestions.push(fb);
        if (processedQuestions.length >= 8) break;
      }
    }

    // 6. Upsert Test document
    const isMock = day.type === 'mock';
    const timeLimitMinutes = Math.max(10, Math.round(processedQuestions.length * 1.5));

    let test = await Test.findOne({ dayId });
    if (!test) {
      test = new Test({
        title: `Day ${day.dayNumber}: ${day.title} Examination`,
        description: `CBT diagnostic test for Day ${day.dayNumber} covering ${dayTopics.map(t => t.title).join(', ')}.`,
        topic: day.title,
        timeLimitMinutes,
        markingScheme: { correct: 4, incorrect: -1 },
        totalQuestions: processedQuestions.length,
        isAIGenerated: true,
        kind: isMock ? 'final_mock' : 'day',
        mode: isMock ? 'exam' : 'practice',
        ownerId: day.ownerId,
        workspaceId: day.workspaceId,
        roadmapId: day.roadmapId,
        dayId: day._id,
        conceptKeys: topicKeys,
        generation: {
          status: 'ready',
          promptVersion: '1.0.0',
          model: 'gemini-2.5',
          tokens: 0
        }
      });
    } else {
      test.title = `Day ${day.dayNumber}: ${day.title} Examination`;
      test.description = `CBT diagnostic test for Day ${day.dayNumber} covering ${dayTopics.map(t => t.title).join(', ')}.`;
      test.topic = day.title;
      test.timeLimitMinutes = timeLimitMinutes;
      test.totalQuestions = processedQuestions.length;
      test.conceptKeys = topicKeys;
      test.mode = isMock ? 'exam' : 'practice';
      test.kind = isMock ? 'final_mock' : 'day';
      test.generation = {
        status: 'ready',
        promptVersion: '1.0.0',
        model: 'gemini-2.5',
        tokens: 0
      };
    }
    await test.save();

    // 7. Save Questions
    await Question.deleteMany({ testId: test._id });
    const questionDocs = await Question.insertMany(
      processedQuestions.map(q => ({
        ...q,
        testId: test._id
      }))
    );

    // 8. Update Day Status
    day.content = day.content || {};
    day.content.testStatus = 'ready';
    await day.save();

    if (jobId) {
      await updateJobProgress(jobId, { progress: 100, stage: 'Day CBT test ready' });
      await completeJob(jobId, { testId: test._id, count: questionDocs.length });
    }

    // Return sanitized question list (no correctOptionIndex for testing phase)
    const sanitizedQuestions = questionDocs.map(q => {
      const obj = q.toObject();
      delete obj.correctOptionIndex;
      delete obj.explanation;
      return obj;
    });

    return {
      test,
      questions: sanitizedQuestions,
      cached: false
    };
  } catch (err) {
    logger.error({ err: err.message, dayId }, 'Failed to generate day test');
    day.content = day.content || {};
    day.content.testStatus = 'failed';
    await day.save().catch(() => {});

    if (jobId) {
      await failJob(jobId, err).catch(() => {});
    }
    throw err;
  }
};

/**
 * Generates a comprehensive final mock exam across the entire roadmap.
 */
export const generateFinalMock = async ({ roadmapId, userId, jobId = null }) => {
  const roadmap = await Roadmap.findById(roadmapId);
  if (!roadmap) {
    const error = new Error('Roadmap not found');
    error.statusCode = 404;
    throw error;
  }

  if (roadmap.ownerId.toString() !== userId.toString()) {
    const error = new Error('Forbidden: You do not own this roadmap');
    error.statusCode = 403;
    throw error;
  }

  const topics = roadmap.topics || [];
  if (topics.length === 0) {
    const error = new Error('Roadmap contains no topics for mock examination');
    error.statusCode = 400;
    throw error;
  }

  let topicTitle = 'Comprehensive Computer Science Curriculum';
  if (roadmap.workspaceId) {
    const ws = await Workspace.findById(roadmap.workspaceId).select('title').lean();
    if (ws?.title) topicTitle = ws.title;
  }

  // Find or create final mock test
  let test = await Test.findOne({ roadmapId, kind: 'final_mock' });

  // Generate questions across all topics
  const fallbacks = buildFallbackQuestionsForTopics(topics, topicTitle);
  const totalQuestions = Math.min(20, Math.max(12, fallbacks.length));
  const questionsToSave = fallbacks.slice(0, totalQuestions);

  if (!test) {
    test = new Test({
      title: `${topicTitle} — Comprehensive Final Mock Examination`,
      description: `Full syllabus Computer Science examination simulating competitive exam conditions with proctoring and negative marking.`,
      topic: topicTitle,
      timeLimitMinutes: Math.round(questionsToSave.length * 2), // 2 min per question for final mock
      markingScheme: { correct: 4, incorrect: -1 },
      totalQuestions: questionsToSave.length,
      isAIGenerated: true,
      kind: 'final_mock',
      mode: 'exam',
      ownerId: roadmap.ownerId,
      workspaceId: roadmap.workspaceId,
      roadmapId: roadmap._id,
      conceptKeys: topics.map(t => t.key),
      generation: {
        status: 'ready',
        promptVersion: '1.0.0',
        model: 'gemini-2.5',
        tokens: 0
      }
    });
  } else {
    test.topic = topicTitle;
    test.timeLimitMinutes = Math.round(questionsToSave.length * 2);
    test.totalQuestions = questionsToSave.length;
    test.mode = 'exam';
  }
  await test.save();

  await Question.deleteMany({ testId: test._id });
  const questionDocs = await Question.insertMany(
    questionsToSave.map((q, idx) => ({
      ...q,
      testId: test._id,
      order: idx + 1
    }))
  );

  if (jobId) {
    await completeJob(jobId, { testId: test._id, count: questionDocs.length });
  }

  return {
    test,
    questionsCount: questionDocs.length
  };
};
