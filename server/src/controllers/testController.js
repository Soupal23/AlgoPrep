import { Test } from '../models/Test.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { Membership } from '../models/Membership.js';

export const getTests = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    let filter = { teacherId: null };

    if (userId) {
      if (userRole === 'teacher') {
        filter = { $or: [{ teacherId: null }, { teacherId: userId }] };
      } else if (userRole === 'student') {
        const memberships = await Membership.find({ studentId: userId, status: 'active' }).select('teacherId');
        const teacherIds = memberships.map((m) => m.teacherId);
        filter = { $or: [{ teacherId: null }, { teacherId: { $in: teacherIds } }] };
      } else if (userRole === 'admin') {
        filter = {}; // Admin sees all tests
      }
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

export const createTeacherTest = async (req, res) => {
  try {
    const teacherId = req.user?.userId;
    const {
      title,
      description,
      topic,
      timeLimitMinutes,
      markingScheme,
      validFrom,
      validUntil,
      questions
    } = req.body;

    if (!title || !description || !topic || !Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ error: 'Title, description, topic, and at least one question are required' });
      return;
    }

    const test = await Test.create({
      title: title.trim(),
      description: description.trim(),
      topic: topic.trim(),
      timeLimitMinutes: timeLimitMinutes || 15,
      markingScheme: markingScheme || { correct: 4, incorrect: -1 },
      totalQuestions: questions.length,
      teacherId,
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
      createdBy: teacherId
    });

    const questionDocs = questions.map((q, idx) => ({
      testId: test._id,
      questionText: q.questionText,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
      explanation: q.explanation || '',
      order: idx + 1
    }));

    await Question.insertMany(questionDocs);

    res.status(201).json({
      message: 'Teacher test created successfully',
      test
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create teacher test' });
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

    // 1. Check teacher-owned test membership gating
    if (test.teacherId) {
      const membership = await Membership.findOne({
        studentId: userId,
        teacherId: test.teacherId,
        status: 'active'
      });

      if (!membership) {
        res.status(403).json({ error: "Forbidden: You must join this teacher's class to take this test" });
        return;
      }
    }

    // 2. Check time availability window
    const now = new Date();

    if (test.validFrom && now < new Date(test.validFrom)) {
      res.status(400).json({ error: 'Test is not available yet' });
      return;
    }

    if (test.validUntil && now > new Date(test.validUntil)) {
      res.status(400).json({ error: 'Test window has expired' });
      return;
    }

    let attempt = await Attempt.findOne({
      userId,
      testId: id,
      status: 'in-progress'
    });

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
