import { Attempt } from '../models/Attempt.js';
import { Test } from '../models/Test.js';
import { Question } from '../models/Question.js';
import { RevisionPlan } from '../models/RevisionPlan.js';
import { calculateScore } from '../utils/scoring.js';
import { ensureTestTagged, isJunkConcept } from '../services/conceptTaggingService.js';
import {
  buildSignals,
  getHistory,
  generateAIPlan,
  buildFallbackPlan
} from '../services/revisionPlanService.js';
import { selectCandidates } from '../data/resourceCatalog.js';
import mongoose from 'mongoose';

export const saveProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { answers, questionStates, questionTimeSpent, version, tabSwitchEvent } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const attempt = await Attempt.findById(id);

    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }

    if (attempt.userId.toString() !== userId) {
      res.status(403).json({ error: 'Forbidden: You do not own this attempt' });
      return;
    }

    if (attempt.status !== 'in-progress') {
      res.status(400).json({ error: `Cannot update progress for a ${attempt.status} test attempt` });
      return;
    }

    if (typeof version === 'number' && version <= attempt.lastSavedVersion) {
      res.status(200).json({
        success: false,
        reason: 'stale_version',
        message: 'Ignored stale progress payload',
        currentVersion: attempt.lastSavedVersion
      });
      return;
    }

    if (answers && typeof answers === 'object') {
      Object.entries(answers).forEach(([qId, optionIdx]) => {
        if (typeof optionIdx === 'number') {
          attempt.answers.set(qId, optionIdx);
        }
      });
    }

    if (questionStates && typeof questionStates === 'object') {
      Object.entries(questionStates).forEach(([qId, qState]) => {
        if (typeof qState === 'string') {
          attempt.questionStates.set(qId, qState);
        }
      });
    }

    if (questionTimeSpent && typeof questionTimeSpent === 'object') {
      if (!attempt.questionTimeSpent) {
        attempt.questionTimeSpent = new Map();
      }
      Object.entries(questionTimeSpent).forEach(([qId, timeSpent]) => {
        if (typeof timeSpent === 'number' && timeSpent >= 0) {
          const current = attempt.questionTimeSpent.get(qId) || 0;
          attempt.questionTimeSpent.set(qId, Math.max(current, Math.round(timeSpent)));
        }
      });
    }

    if (typeof version === 'number') {
      attempt.lastSavedVersion = version;
    }

    let timeRemainingSeconds = undefined;
    let endTimeIso = undefined;

    if (tabSwitchEvent) {
      attempt.tabSwitches += 1;
      const penalty = typeof tabSwitchEvent.penaltySeconds === 'number' ? tabSwitchEvent.penaltySeconds : 600;
      attempt.penaltySeconds = (attempt.penaltySeconds || 0) + penalty;
      attempt.tabSwitchEvents.push({
        timestamp: new Date(tabSwitchEvent.timestamp || Date.now()),
        reason: tabSwitchEvent.reason || 'tab_switch',
        penaltySeconds: penalty
      });
    }

    await attempt.save();

    const test = await Test.findById(attempt.testId);
    if (test) {
      const startTime = new Date(attempt.startedAt).getTime();
      const penaltyMs = (attempt.penaltySeconds || 0) * 1000;
      const effectiveEndMs = startTime + test.timeLimitMinutes * 60 * 1000 - penaltyMs;
      timeRemainingSeconds = Math.max(0, Math.floor((effectiveEndMs - Date.now()) / 1000));
      endTimeIso = new Date(effectiveEndMs).toISOString();
    }

    res.json({
      success: true,
      lastSavedVersion: attempt.lastSavedVersion,
      tabSwitches: attempt.tabSwitches,
      penaltySeconds: attempt.penaltySeconds,
      endTime: endTimeIso,
      timeRemainingSeconds,
      isExpired: typeof timeRemainingSeconds === 'number' && timeRemainingSeconds <= 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save attempt progress' });
  }
};

export const submitAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { answers, questionStates, questionTimeSpent, version } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const attempt = await Attempt.findById(id);

    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }

    if (attempt.userId.toString() !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (attempt.status !== 'in-progress') {
      res.json({
        message: 'Attempt already submitted',
        attempt
      });
      return;
    }

    if (answers && typeof answers === 'object') {
      Object.entries(answers).forEach(([qId, optionIdx]) => {
        if (typeof optionIdx === 'number') {
          attempt.answers.set(qId, optionIdx);
        }
      });
    }

    if (questionStates && typeof questionStates === 'object') {
      Object.entries(questionStates).forEach(([qId, qState]) => {
        if (typeof qState === 'string') {
          attempt.questionStates.set(qId, qState);
        }
      });
    }

    if (questionTimeSpent && typeof questionTimeSpent === 'object') {
      if (!attempt.questionTimeSpent) {
        attempt.questionTimeSpent = new Map();
      }
      Object.entries(questionTimeSpent).forEach(([qId, timeSpent]) => {
        if (typeof timeSpent === 'number' && timeSpent >= 0) {
          const current = attempt.questionTimeSpent.get(qId) || 0;
          attempt.questionTimeSpent.set(qId, Math.max(current, Math.round(timeSpent)));
        }
      });
    }

    const test = await Test.findById(attempt.testId);
    if (!test) {
      res.status(404).json({ error: 'Associated test not found' });
      return;
    }

    const now = new Date();
    const startTime = new Date(attempt.startedAt).getTime();
    const elapsedSeconds = Math.floor((now.getTime() - startTime) / 1000);
    const penaltySec = attempt.penaltySeconds || 0;
    const effectiveTimeLimitSec = Math.max(0, (test.timeLimitMinutes * 60) - penaltySec);
    const actualTimeSpent = Math.min(elapsedSeconds, effectiveTimeLimitSec);

    const questions = await Question.find({ testId: test._id });
    const scoringResult = calculateScore(attempt.answers, questions, test.markingScheme);

    attempt.score = scoringResult.score;
    attempt.maxScore = scoringResult.maxScore;
    attempt.accuracy = scoringResult.accuracy;
    attempt.timeSpentSeconds = actualTimeSpent;
    attempt.status = 'submitted';
    attempt.submittedAt = now;
    if (typeof version === 'number') {
      attempt.lastSavedVersion = version;
    }

    await attempt.save();

    res.json({
      message: 'Test submitted successfully',
      attempt: {
        id: attempt._id,
        testId: attempt.testId,
        testTitle: test.title,
        status: attempt.status,
        score: attempt.score,
        maxScore: attempt.maxScore,
        accuracy: attempt.accuracy,
        timeSpentSeconds: attempt.timeSpentSeconds,
        tabSwitches: attempt.tabSwitches,
        scoringBreakdown: scoringResult,
        submittedAt: attempt.submittedAt
      }
    });
  } catch (err) {
    console.error('Submit attempt error:', err);
    res.status(500).json({ error: 'Failed to submit test attempt' });
  }
};

export const getAttemptById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const attempt = await Attempt.findById(id).populate('testId');
    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }

    if (attempt.userId.toString() !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({ attempt });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch attempt' });
  }
};

export const getUserAttempts = async (req, res) => {
  try {
    const userId = req.user?.userId;

    const attempts = await Attempt.find({ userId, status: 'submitted' })
      .populate('testId', 'title topic timeLimitMinutes totalQuestions markingScheme')
      .sort({ submittedAt: -1 });

    res.json({ attempts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user attempts' });
  }
};

export const getAttemptReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const attempt = await Attempt.findById(id).populate('testId');
    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }

    if (attempt.userId.toString() !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const questions = await Question.find({ testId: attempt.testId._id }).sort({ order: 1 });

    const userAnswers = attempt.answers || new Map();
    const questionStates = attempt.questionStates || new Map();
    const timeSpentMap = attempt.questionTimeSpent || new Map();

    const reviewQuestions = questions.map((q) => {
      const qId = q._id.toString();
      const selectedOptionIndex = userAnswers.get ? userAnswers.get(qId) : userAnswers[qId];
      const qState = questionStates.get ? questionStates.get(qId) : questionStates[qId];
      const timeSpent = timeSpentMap.get ? timeSpentMap.get(qId) : timeSpentMap[qId] || 0;
      const isMarked = qState === 'marked' || qState === 'answered_marked';

      let isCorrect = false;
      let status = 'unattempted';

      if (selectedOptionIndex !== undefined && selectedOptionIndex !== null && selectedOptionIndex >= 0) {
        if (selectedOptionIndex === q.correctOptionIndex) {
          isCorrect = true;
          status = 'correct';
        } else {
          isCorrect = false;
          status = 'incorrect';
        }
      }

      return {
        _id: q._id,
        order: q.order,
        questionText: q.questionText,
        options: q.options,
        selectedOptionIndex: selectedOptionIndex !== undefined ? selectedOptionIndex : null,
        correctOptionIndex: q.correctOptionIndex,
        explanation: q.explanation,
        status,
        isCorrect,
        timeSpent,
        isMarked,
        concept: q.concept || null,
        difficulty: q.difficulty || null
      };
    });

    res.json({
      attempt,
      test: attempt.testId,
      questions: reviewQuestions
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch test review' });
  }
};

export const getAIRevisionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const attempt = await Attempt.findById(id).populate('testId');
    if (!attempt || attempt.userId.toString() !== userId) {
      res.status(403).json({ error: 'Unauthorized or attempt not found' });
      return;
    }

    if (attempt.status !== 'submitted') {
      res.status(400).json({ error: 'Cannot generate a revision plan for an unsubmitted test attempt' });
      return;
    }

    // 1. Check for existing persisted revision plan
    const existingPlan = await RevisionPlan.findOne({ attemptId: id });
    if (existingPlan && existingPlan.schemaVersion === 1) {
      const hasJunkStrengths = existingPlan.plan?.strengths?.some(isJunkConcept);
      const hasJunkWeak = existingPlan.plan?.weakConcepts?.some((w) => isJunkConcept(w.concept));

      if (hasJunkStrengths || hasJunkWeak) {
        // Plan was poisoned by historical junk concepts; delete it to heal and re-generate clean plan
        await RevisionPlan.deleteOne({ _id: existingPlan._id });
      } else {
        res.json({
          plan: existingPlan.plan,
          source: existingPlan.source,
          generatedAt: existingPlan.generatedAt,
          canRegenerate: existingPlan.regenerateCount < 3,
          regenerateCount: existingPlan.regenerateCount
        });
        return;
      }
    }

    // 2. Ensure test has concepts & difficulty tags (tag-on-first-use)
    await ensureTestTagged(attempt.testId._id);

    // 3. Fetch questions with tags
    const questions = await Question.find({ testId: attempt.testId._id }).sort({ order: 1 });

    // 4. Extract history, signals, and candidate resources
    const history = await getHistory(userId, attempt.testId._id, attempt._id);
    const signals = await buildSignals(attempt, attempt.testId, questions, history);
    const candidateResources = selectCandidates(
      attempt.testId.topic,
      Array.from(signals.conceptMap.keys())
    );

    // 5. Try generating AI plan; gracefully fallback to deterministic schema plan if AI fails
    let plan = null;
    let source = 'fallback';

    try {
      plan = await generateAIPlan(signals, history, candidateResources);
      source = 'ai';
    } catch (aiErr) {
      console.warn('AI revision generation failed, using structured fallback:', aiErr.message);
      plan = buildFallbackPlan(signals, history, candidateResources);
      source = 'fallback';
    }

    const conceptKeys = Array.from(signals.conceptMap.values()).map((c) => c.conceptKey);

    // 6. Persist revision plan atomically
    const savedDoc = await RevisionPlan.findOneAndUpdate(
      { attemptId: attempt._id },
      {
        $setOnInsert: {
          attemptId: attempt._id,
          userId: attempt.userId,
          testId: attempt.testId._id,
          source,
          schemaVersion: 1,
          plan,
          conceptKeys,
          regenerateCount: 0,
          previousPlan: null,
          generatedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    res.json({
      plan: savedDoc.plan,
      source: savedDoc.source,
      generatedAt: savedDoc.generatedAt,
      canRegenerate: savedDoc.regenerateCount < 3,
      regenerateCount: savedDoc.regenerateCount
    });
  } catch (err) {
    console.error('getAIRevisionPlan error:', err);
    res.status(500).json({ error: 'Failed to generate revision plan' });
  }
};

export const regenerateAIRevisionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const attempt = await Attempt.findById(id).populate('testId');
    if (!attempt || attempt.userId.toString() !== userId) {
      res.status(403).json({ error: 'Unauthorized or attempt not found' });
      return;
    }

    if (attempt.status !== 'submitted') {
      res.status(400).json({ error: 'Cannot regenerate revision plan for an unsubmitted test' });
      return;
    }

    const existingPlan = await RevisionPlan.findOne({ attemptId: id });
    if (!existingPlan) {
      res.status(404).json({ error: 'No existing revision plan found to regenerate' });
      return;
    }

    if (existingPlan.regenerateCount >= 3) {
      res.status(400).json({ error: 'Maximum revision plan regenerations (3) reached for this attempt' });
      return;
    }

    // Ensure test has tags (retries if tagging had previously failed)
    await ensureTestTagged(attempt.testId._id);

    const questions = await Question.find({ testId: attempt.testId._id }).sort({ order: 1 });
    const history = await getHistory(userId, attempt.testId._id, attempt._id);
    const signals = await buildSignals(attempt, attempt.testId, questions, history);
    const candidateResources = selectCandidates(
      attempt.testId.topic,
      Array.from(signals.conceptMap.keys())
    );

    // Must make a fresh AI call
    let newPlan = null;
    try {
      newPlan = await generateAIPlan(signals, history, candidateResources);
    } catch (aiErr) {
      console.warn('AI regeneration call failed:', aiErr.message);
      res.status(503).json({
        error: 'AI regeneration failed. Preserving your existing plan.',
        plan: existingPlan.plan,
        source: existingPlan.source,
        canRegenerate: existingPlan.regenerateCount < 3,
        regenerateCount: existingPlan.regenerateCount
      });
      return;
    }

    const conceptKeys = Array.from(signals.conceptMap.values()).map((c) => c.conceptKey);

    existingPlan.previousPlan = existingPlan.plan;
    existingPlan.plan = newPlan;
    existingPlan.source = 'ai';
    existingPlan.conceptKeys = conceptKeys;
    existingPlan.regenerateCount += 1;
    existingPlan.generatedAt = new Date();

    await existingPlan.save();

    res.json({
      plan: existingPlan.plan,
      source: existingPlan.source,
      generatedAt: existingPlan.generatedAt,
      canRegenerate: existingPlan.regenerateCount < 3,
      regenerateCount: existingPlan.regenerateCount
    });
  } catch (err) {
    console.error('regenerateAIRevisionPlan error:', err);
    res.status(500).json({ error: 'Failed to regenerate revision plan' });
  }
};
