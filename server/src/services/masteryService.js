import { z } from 'zod';
import { ConceptMastery } from '../models/ConceptMastery.js';
import { Analysis } from '../models/Analysis.js';
import { Attempt } from '../models/Attempt.js';
import { Test } from '../models/Test.js';
import { Question } from '../models/Question.js';
import { Roadmap } from '../models/Roadmap.js';
import { buildSignals } from './revisionPlanService.js';
import { replanRoadmapForWeakConcepts } from './replanService.js';
import { llmGateway } from '../ai/llmGateway.js';
import { PROMPTS } from '../ai/prompts/index.js';
import logger from '../utils/logger.js';

const analysisResponseSchema = z.object({
  summary: z.string().min(10),
  nextSteps: z.array(z.string().min(5)).min(1)
});

/**
 * Computes performance for a single question based on accuracy, difficulty, and behavioral signals.
 */
export function calculateQuestionPerformance(qInfo) {
  let score = qInfo.isCorrect ? 1.0 : 0.0;

  // Weight difficulty
  const diffMultiplier = {
    easy: 0.85,
    medium: 1.0,
    hard: 1.15
  }[qInfo.difficulty] || 1.0;

  score *= diffMultiplier;

  // Apply behavioral penalties
  const signals = qInfo.signals || [];
  if (signals.includes('fast_wrong')) score -= 0.15; // careless guess
  if (signals.includes('slow_wrong')) score -= 0.10; // conceptual struggle
  if (signals.includes('marked_for_review') && !qInfo.isCorrect) score -= 0.05; // uncertainty

  return Math.max(0.0, Math.min(1.0, score));
}

/**
 * Updates ConceptMastery records across all concepts tested in an attempt.
 * Uses running weighted moving average: M_new = (1 - alpha) * M_old + alpha * performance
 */
export async function updateMasteryForAttempt({ attempt, test, questions, signals }) {
  const workspaceId = test.workspaceId || attempt.workspaceId;
  const ownerId = attempt.userId;

  const conceptGroups = new Map();

  // Group questions by conceptKey
  for (const q of questions) {
    const qId = q._id.toString();
    const missedInfo = (signals.missedQuestions || []).find((m) => m.questionId === qId);

    const userAnswers = attempt.answers || new Map();
    const selected = userAnswers.get ? userAnswers.get(qId) : userAnswers[qId];
    const isCorrect = selected === q.correctOptionIndex;

    const qInfo = missedInfo || {
      isCorrect,
      difficulty: q.difficulty || 'medium',
      signals: []
    };

    const key = q.conceptKey || q.concept || test.topic || 'general-principles';
    if (!conceptGroups.has(key)) {
      conceptGroups.set(key, {
        conceptKey: key,
        conceptTitle: q.concept || key,
        questions: []
      });
    }

    conceptGroups.get(key).questions.push(qInfo);
  }

  const masteryDelta = [];
  const weakConcepts = [];
  const strengths = [];

  for (const [key, group] of conceptGroups.entries()) {
    // Calculate concept performance on this test
    const perfs = group.questions.map((q) => calculateQuestionPerformance(q));
    const avgPerf = perfs.reduce((sum, p) => sum + p, 0) / (perfs.length || 1);

    let existingMastery = null;
    if (workspaceId) {
      existingMastery = await ConceptMastery.findOne({
        ownerId,
        workspaceId,
        conceptKey: key
      });
    }

    const before = existingMastery ? existingMastery.mastery : 0.5;
    const alpha = 0.4;
    const after = Number(Math.max(0.0, Math.min(1.0, (1 - alpha) * before + alpha * avgPerf)).toFixed(2));
    const delta = Number((after - before).toFixed(2));

    // Spaced Repetition Schedule (SM-2 intervals)
    let intervalDays = 1;
    if (after >= 0.8) intervalDays = 7;
    else if (after >= 0.6) intervalDays = 3;
    else intervalDays = 1;

    const nextReviewAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

    if (workspaceId) {
      await ConceptMastery.findOneAndUpdate(
        { ownerId, workspaceId, conceptKey: key },
        {
          $set: {
            conceptTitle: group.conceptTitle,
            mastery: after,
            lastPracticedAt: new Date(),
            nextReviewAt
          },
          $inc: { attempts: 1 },
          $push: {
            history: {
              attemptId: attempt._id,
              performance: Number(avgPerf.toFixed(2)),
              at: new Date()
            }
          }
        },
        { upsert: true, new: true }
      );
    }

    const deltaObj = {
      conceptKey: key,
      conceptTitle: group.conceptTitle,
      before,
      after,
      delta
    };
    masteryDelta.push(deltaObj);

    if (after < 0.6) {
      weakConcepts.push({
        conceptKey: key,
        conceptTitle: group.conceptTitle,
        mastery: after,
        reason: avgPerf < 0.4 ? 'Low accuracy and slow problem-solving indicates foundational gaps' : 'Retention below mastery threshold'
      });
    } else if (after >= 0.75) {
      strengths.push({
        conceptKey: key,
        conceptTitle: group.conceptTitle,
        mastery: after
      });
    }
  }

  return { masteryDelta, weakConcepts, strengths };
}

/**
 * Generates comprehensive post-test analysis, updates mastery, and triggers dynamic re-planning.
 */
export async function generateAttemptAnalysis({ attemptId, userId }) {
  // 1. Check if Analysis already exists
  const existing = await Analysis.findOne({ attemptId }).lean();
  if (existing) {
    if (userId && existing.ownerId.toString() !== userId.toString()) {
      const error = new Error('Forbidden: You do not own this attempt');
      error.statusCode = 403;
      throw error;
    }
    return existing;
  }

  const attempt = await Attempt.findById(attemptId);
  if (!attempt) {
    const error = new Error('Attempt not found');
    error.statusCode = 404;
    throw error;
  }

  if (attempt.userId.toString() !== userId.toString()) {
    const error = new Error('Forbidden: You do not own this attempt');
    error.statusCode = 403;
    throw error;
  }

  const test = await Test.findById(attempt.testId).lean();
  if (!test) {
    const error = new Error('Associated test not found');
    error.statusCode = 404;
    throw error;
  }

  const questions = await Question.find({ testId: test._id }).lean();

  // 2. Behavioral signals & mastery update
  const signals = await buildSignals(attempt, test, questions);
  const { masteryDelta, weakConcepts, strengths } = await updateMasteryForAttempt({
    attempt,
    test,
    questions,
    signals
  });

  // 3. Synthesize summary and next steps
  let summary = `You achieved ${attempt.score}/${attempt.maxScore} points with ${attempt.accuracy}% accuracy. `;
  if (weakConcepts.length > 0) {
    summary += `Targeted review is recommended for ${weakConcepts.map((w) => w.conceptTitle || w.conceptKey).join(', ')}.`;
  } else {
    summary += `Excellent conceptual retention across all evaluated topics!`;
  }

  let nextSteps = [
    'Review detailed question derivations and explanations below.',
    'Test active recall by reviewing flashcards in your Day Notes.'
  ];
  if (weakConcepts.length > 0) {
    nextSteps.unshift(
      `Dedicate 20 minutes to re-read the foundational notes for ${weakConcepts[0].conceptTitle || weakConcepts[0].conceptKey}.`
    );
  }

  let source = 'fallback';

  // 4. Try LLM Pass for Personalized Executive Coaching
  try {
    const promptObj = PROMPTS['test.analysis.v1'];
    const response = await llmGateway.generateObject({
      task: 'attempt_analysis',
      prompt: promptObj.template({
        testTitle: test.title,
        score: attempt.score,
        maxScore: attempt.maxScore,
        accuracy: attempt.accuracy,
        weakConcepts,
        strengths,
        masteryDelta
      }),
      systemPrompt: promptObj.system,
      schema: analysisResponseSchema,
      modelTier: 'fast',
      temperature: 0.3
    });

    const parsed = response?.data || response?.object;
    if (parsed?.summary && Array.isArray(parsed?.nextSteps) && parsed.nextSteps.length > 0) {
      summary = parsed.summary;
      nextSteps = parsed.nextSteps;
      source = 'ai';
    }
  } catch (llmErr) {
    logger.debug({ err: llmErr.message }, 'LLM analysis skipped, using deterministic signals');
  }

  // 5. Save Analysis Document
  let analysisDoc;
  try {
    analysisDoc = await Analysis.create({
      attemptId: attempt._id,
      ownerId: attempt.userId,
      workspaceId: test.workspaceId || attempt.workspaceId || null,
      dayId: test.dayId || attempt.dayId || null,
      summary,
      weakConcepts,
      strengths,
      nextSteps,
      masteryDelta,
      source
    });
  } catch (err) {
    if (err.code === 11000) {
      const existingDoc = await Analysis.findOne({ attemptId: attempt._id });
      if (existingDoc) return existingDoc;
    }
    throw err;
  }

  // 6. Trigger Dynamic Re-planning if roadmap and weak concepts exist
  let roadmapId = test.roadmapId;
  if (!roadmapId && (test.workspaceId || attempt.workspaceId)) {
    const rm = await Roadmap.findOne({
      workspaceId: test.workspaceId || attempt.workspaceId,
      ownerId: attempt.userId
    }).select('_id').lean();
    if (rm) roadmapId = rm._id;
  }

  if (roadmapId && weakConcepts.length > 0) {
    try {
      await replanRoadmapForWeakConcepts({
        roadmapId,
        userId,
        weakConcepts
      });
    } catch (replanErr) {
      logger.warn({ err: replanErr.message, roadmapId }, 'Roadmap dynamic re-planning encounter skipped');
    }
  }

  return analysisDoc;
}

/**
 * Retrieves all ConceptMastery entries for a student workspace.
 */
export async function getWorkspaceMastery(workspaceId, userId) {
  const concepts = await ConceptMastery.find({ workspaceId, ownerId: userId })
    .sort({ mastery: 1 })
    .lean();

  return {
    workspaceId,
    count: concepts.length,
    concepts
  };
}

/**
 * Retrieves re-planning version change logs for a roadmap.
 */
export async function getRoadmapChanges(roadmapId, userId) {
  const roadmap = await Roadmap.findById(roadmapId).lean();
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

  return {
    roadmapId,
    version: roadmap.version || 1,
    changeLog: roadmap.changeLog || []
  };
}
