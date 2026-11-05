import mongoose from 'mongoose';
import { Test } from '../models/Test.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';

export const getTests = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    let filter = {};

    if (userRole === 'admin') {
      filter = {};
    } else if (userId) {
      const userObjId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
      filter = {
        $or: [
          { kind: 'platform' },
          { kind: { $exists: false } },
          { ownerId: userObjId },
          { createdBy: userObjId }
        ]
      };
    } else {
      filter = {
        $or: [
          { kind: 'platform' },
          { kind: { $exists: false }, isAIGenerated: { $ne: true } }
        ]
      };
    }

    const tests = await Test.find(filter).sort({ createdAt: -1 });
    res.json({ tests });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
};

export const getTestById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const test = await Test.findById(id);

    if (!test) {
      res.status(404).json({ error: 'Test not found' });
      return;
    }

    const isPlatform = test.kind === 'platform' || (!test.isAIGenerated && !test.ownerId && !test.teacherId);
    const isOwner = userId && (test.ownerId?.toString() === userId.toString() || test.createdBy?.toString() === userId.toString());
    const isAdmin = userRole === 'admin';

    if (!isPlatform && !isOwner && !isAdmin) {
      res.status(403).json({ error: 'Forbidden: This test is private to the user who created it' });
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

    const isPlatform = test.kind === 'platform' || (!test.isAIGenerated && !test.ownerId && !test.teacherId);
    const isOwner = test.ownerId?.toString() === userId.toString() || test.createdBy?.toString() === userId.toString();
    const isAdmin = req.user?.role === 'admin';

    if (!isPlatform && !isOwner && !isAdmin) {
      res.status(403).json({ error: 'Forbidden: This test is private to the user who created it' });
      return;
    }

    const now = new Date();

    let attempt = await Attempt.findOne({
      userId,
      testId: id,
      status: 'in-progress'
    });

    let wasResumed = false;

    if (attempt) {
      const startTime = new Date(attempt.startedAt).getTime();
      const penaltyMs = (attempt.penaltySeconds || 0) * 1000;
      const maxAllowedTimeMs = (test.timeLimitMinutes * 60 + 60) * 1000 - penaltyMs;

      const isExplicitFresh = req.query.fresh === 'true' || req.query.retake === 'true';

      if (now.getTime() - startTime > maxAllowedTimeMs || isExplicitFresh) {
        attempt.status = 'expired';
        await attempt.save();
        attempt = null;
      } else {
        // Only apply penalty in exam mode or legacy platform tests
        const isExamMode = test.mode !== 'practice';
        if (now.getTime() - startTime > 5000 && isExamMode) {
          wasResumed = true;
          attempt.tabSwitches += 1;
          attempt.penaltySeconds = (attempt.penaltySeconds || 0) + 600;
          attempt.tabSwitchEvents.push({
            timestamp: now,
            reason: 'session_reentry',
            penaltySeconds: 600
          });
          await attempt.save();
        }
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
        penaltySeconds: 0,
        tabSwitchEvents: []
      });
      await attempt.save();
    }

    const questions = await Question.find({ testId: id })
      .sort({ order: 1 })
      .select('-correctOptionIndex -explanation');

    const startTime = new Date(attempt.startedAt).getTime();
    const currentPenaltyMs = (attempt.penaltySeconds || 0) * 1000;
    const endTime = startTime + test.timeLimitMinutes * 60 * 1000 - currentPenaltyMs;

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
      tabSwitches: attempt.tabSwitches,
      penaltySeconds: attempt.penaltySeconds || 0,
      wasResumed
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start or resume test attempt' });
  }
};

export const deleteTest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const test = await Test.findById(id);
    if (!test) {
      res.status(404).json({ error: 'Test not found' });
      return;
    }

    if (test.kind === 'platform') {
      res.status(403).json({ error: 'Cannot delete core platform test benchmarks via API' });
      return;
    }

    const isOwner = test.ownerId?.toString() === userId?.toString() || test.createdBy?.toString() === userId?.toString();
    if (userRole !== 'admin' && !isOwner) {
      res.status(403).json({ error: 'Forbidden: You do not have permission to delete this test' });
      return;
    }

    await Question.deleteMany({ testId: id });
    await Attempt.deleteMany({ testId: id });
    await Test.findByIdAndDelete(id);

    res.json({ message: 'Test deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete test' });
  }
};
