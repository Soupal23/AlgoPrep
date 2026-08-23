import { Test } from '../models/Test.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';

export const getTests = async (req, res) => {
  try {
    const tests = await Test.find().sort({ createdAt: -1 });
    res.json({ tests });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
};

export const getTestById = async (req, res) => {
  try {
    const { id } = req.params;
    const test = await Test.findById(id);

    if (!test) {
      res.status(404).json({ error: 'Test not found' });
      return;
    }

    const questions = await Question.find({ testId: id })
      .sort({ order: 1 })
      .select('-correctOptionIndex -explanation');

    res.json({ test, questions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch test details' });
  }
};

export const startTestAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const test = await Test.findById(id);
    if (!test) {
      res.status(404).json({ error: 'Test not found' });
      return;
    }

    let attempt = await Attempt.findOne({
      userId,
      testId: id,
      status: 'in-progress'
    });

    const now = new Date();

    if (attempt) {
      const startTime = new Date(attempt.startedAt).getTime();
      const maxAllowedTimeMs = (test.timeLimitMinutes * 60 + 60) * 1000;

      const isExplicitFresh = req.query.fresh === 'true' || req.query.retake === 'true';

      if (now.getTime() - startTime > maxAllowedTimeMs || isExplicitFresh) {
        attempt.status = 'expired';
        await attempt.save();
        attempt = null;
      }
    }

    if (!attempt) {
      attempt = new Attempt({
        userId,
        testId: id,
        startedAt: now,
        status: 'in-progress',
        lastSavedVersion: 0,
        tabSwitches: 0,
        tabSwitchEvents: []
      });
      await attempt.save();
    }

    const questions = await Question.find({ testId: id })
      .sort({ order: 1 })
      .select('-correctOptionIndex -explanation');

    const startTime = new Date(attempt.startedAt).getTime();
    const endTime = startTime + test.timeLimitMinutes * 60 * 1000;

    const answersObj = {};
    if (attempt.answers) {
      attempt.answers.forEach((val, key) => {
        answersObj[key] = val;
      });
    }

    const questionStatesObj = {};
    if (attempt.questionStates) {
      attempt.questionStates.forEach((val, key) => {
        questionStatesObj[key] = val;
      });
    }

    res.json({
      attemptId: attempt._id,
      test,
      questions,
      startedAt: attempt.startedAt,
      endTime: new Date(endTime).toISOString(),
      timeRemainingSeconds: Math.max(0, Math.floor((endTime - now.getTime()) / 1000)),
      answers: answersObj,
      questionStates: questionStatesObj,
      lastSavedVersion: attempt.lastSavedVersion,
      tabSwitches: attempt.tabSwitches
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start or resume test attempt' });
  }
};
