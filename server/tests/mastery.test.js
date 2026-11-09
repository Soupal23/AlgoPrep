import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Workspace } from '../src/models/Workspace.js';
import { Roadmap } from '../src/models/Roadmap.js';
import { Day } from '../src/models/Day.js';
import { Test } from '../src/models/Test.js';
import { Question } from '../src/models/Question.js';
import { Attempt } from '../src/models/Attempt.js';
import { ConceptMastery } from '../src/models/ConceptMastery.js';
import { Analysis } from '../src/models/Analysis.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { llmGateway } from '../src/ai/llmGateway.js';
import { replanRoadmapForWeakConcepts } from '../src/services/replanService.js';
import {
  calculateQuestionPerformance,
  updateMasteryForAttempt,
  generateAttemptAnalysis,
  getWorkspaceMastery,
  getRoadmapChanges
} from '../src/services/masteryService.js';

let mongoServer;
let student, token;
let otherStudent, otherToken;
let workspace, roadmap, day1, dayRevision;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Workspace.deleteMany({});
  await Roadmap.deleteMany({});
  await Day.deleteMany({});
  await Test.deleteMany({});
  await Question.deleteMany({});
  await Attempt.deleteMany({});
  await ConceptMastery.deleteMany({});
  await Analysis.deleteMany({});

  vi.spyOn(llmGateway, 'generateObject').mockResolvedValue({
    data: {
      summary: 'Personalized diagnostic feedback for your test performance.',
      nextSteps: [
        'Review vector clock causality derivations.',
        'Solve 5 practice problems on clock intervals.'
      ]
    }
  });

  // Seed primary student
  student = await User.create({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    password: 'password123',
    role: 'student'
  });
  token = generateAccessToken({ userId: student._id.toString(), role: 'student' });

  // Seed second student for auth guard testing
  otherStudent = await User.create({
    name: 'Charles Babbage',
    email: 'charles@example.com',
    password: 'password123',
    role: 'student'
  });
  otherToken = generateAccessToken({ userId: otherStudent._id.toString(), role: 'student' });

  // Workspace
  workspace = await Workspace.create({
    title: 'Distributed Systems & Concurrency',
    subject: 'Computer Science',
    ownerId: student._id
  });

  // Roadmap with learn day and revision day
  roadmap = await Roadmap.create({
    workspaceId: workspace._id,
    ownerId: student._id,
    version: 1,
    topics: [
      { key: 'raft-consensus', title: 'Raft Consensus Algorithm', estMinutes: 60 },
      { key: 'vector-clocks', title: 'Vector Clocks and Causality', estMinutes: 60 }
    ],
    days: [],
    changeLog: []
  });

  day1 = await Day.create({
    ownerId: student._id,
    workspaceId: workspace._id,
    roadmapId: roadmap._id,
    dayNumber: 1,
    title: 'Day 1: Raft Consensus',
    type: 'learn',
    topicKeys: ['raft-consensus'],
    status: 'in_progress',
    estMinutes: 60
  });

  dayRevision = await Day.create({
    ownerId: student._id,
    workspaceId: workspace._id,
    roadmapId: roadmap._id,
    dayNumber: 7,
    title: 'Day 7: Comprehensive Revision',
    type: 'revision',
    topicKeys: [],
    status: 'locked',
    estMinutes: 90
  });

  roadmap.days = [day1._id, dayRevision._id];
  await roadmap.save();
});

describe('Phase 8: Concept Mastery Tracking & Spaced Repetition', () => {
  it('calculates question performance with difficulty weighting and behavioral signals', () => {
    // Perfect correct easy question (0.85x multiplier)
    const p1 = calculateQuestionPerformance({
      isCorrect: true,
      difficulty: 'easy',
      signals: []
    });
    expect(p1).toBeCloseTo(0.85, 2);

    // Medium correct question (1.0x multiplier)
    const p2 = calculateQuestionPerformance({
      isCorrect: true,
      difficulty: 'medium',
      signals: []
    });
    expect(p2).toBeCloseTo(1.0, 2);

    // Fast wrong penalty (-0.15)
    const p3 = calculateQuestionPerformance({
      isCorrect: false,
      difficulty: 'medium',
      signals: ['fast_wrong']
    });
    expect(p3).toBe(0.0); // Clamped at 0
  });

  it('updates concept mastery using running weighted moving average: M_new = (1 - alpha)*M_old + alpha*perf (alpha=0.4)', async () => {
    const test = await Test.create({
      workspaceId: workspace._id,
      dayId: day1._id,
      roadmapId: roadmap._id,
      title: 'Day 1 CBT Test',
      description: 'Day 1 Diagnostic CBT Test',
      topic: 'Raft Consensus',
      totalQuestions: 2,
      timeLimitMinutes: 10,
      createdBy: student._id
    });

    const q1 = await Question.create({
      testId: test._id,
      conceptKey: 'raft-consensus',
      concept: 'Raft Consensus Algorithm',
      questionText: 'What is the role of term numbers in Raft?',
      options: ['Logical clock', 'Hardware counter', 'Network id', 'Thread tag'],
      correctOptionIndex: 0,
      difficulty: 'medium',
      explanation: 'Terms act as logical clocks in Raft.',
      order: 1
    });

    const q2 = await Question.create({
      testId: test._id,
      conceptKey: 'raft-consensus',
      concept: 'Raft Consensus Algorithm',
      questionText: 'How is split-brain avoided in Raft elections?',
      options: ['Majority quorum', 'Random timeouts', 'Leader ping', 'Static IDs'],
      correctOptionIndex: 0,
      difficulty: 'medium',
      explanation: 'Majority quorums prevent split brain.',
      order: 2
    });

    // Attempt 1: 100% correct
    const attempt1 = await Attempt.create({
      testId: test._id,
      userId: student._id,
      workspaceId: workspace._id,
      dayId: day1._id,
      answers: new Map([[q1._id.toString(), 0], [q2._id.toString(), 0]]),
      status: 'submitted',
      score: 2,
      maxScore: 2,
      accuracy: 100
    });

    const questions = [q1, q2];
    const signals = { missedQuestions: [] };

    // Initial default mastery is 0.5.
    // M_new = 0.6 * 0.5 + 0.4 * 1.0 = 0.3 + 0.4 = 0.70
    const res1 = await updateMasteryForAttempt({ attempt: attempt1, test, questions, signals });
    expect(res1.masteryDelta[0].before).toBe(0.5);
    expect(res1.masteryDelta[0].after).toBe(0.7);
    expect(res1.masteryDelta[0].delta).toBe(0.2);

    const masteryDoc1 = await ConceptMastery.findOne({ workspaceId: workspace._id, conceptKey: 'raft-consensus' });
    expect(masteryDoc1).toBeTruthy();
    expect(masteryDoc1.mastery).toBe(0.7);
    expect(masteryDoc1.attempts).toBe(1);

    // Spaced repetition for 0.7 (>= 0.6 and < 0.8): 3 days interval
    const diffDays1 = Math.round((new Date(masteryDoc1.nextReviewAt) - new Date()) / (24 * 60 * 60 * 1000));
    expect(diffDays1).toBe(3);

    // Attempt 2: 100% correct again
    // M_new = 0.6 * 0.70 + 0.4 * 1.0 = 0.42 + 0.40 = 0.82
    const res2 = await updateMasteryForAttempt({ attempt: attempt1, test, questions, signals });
    expect(res2.masteryDelta[0].before).toBe(0.7);
    expect(res2.masteryDelta[0].after).toBe(0.82);

    const masteryDoc2 = await ConceptMastery.findOne({ workspaceId: workspace._id, conceptKey: 'raft-consensus' });
    expect(masteryDoc2.mastery).toBe(0.82);
    expect(masteryDoc2.attempts).toBe(2);

    // Spaced repetition for >= 0.8: 7 days interval
    const diffDays2 = Math.round((new Date(masteryDoc2.nextReviewAt) - new Date()) / (24 * 60 * 60 * 1000));
    expect(diffDays2).toBe(7);
  });
});

describe('Phase 8: Dynamic Re-planning Service', () => {
  it('deterministically inserts weak concepts (<0.6) into future revision days and increments roadmap.version', async () => {
    const weakConcepts = [
      {
        conceptKey: 'raft-consensus',
        conceptTitle: 'Raft Consensus Algorithm',
        mastery: 0.35,
        reason: 'Low accuracy and slow problem-solving indicates foundational gaps'
      }
    ];

    const updatedRoadmap = await replanRoadmapForWeakConcepts({
      roadmapId: roadmap._id,
      userId: student._id,
      weakConcepts
    });

    expect(updatedRoadmap.version).toBe(2);
    expect(updatedRoadmap.changeLog.length).toBe(1);
    expect(updatedRoadmap.changeLog[0].version).toBe(2);
    expect(updatedRoadmap.changeLog[0].change).toContain('Raft Consensus Algorithm');

    // Day 7 (revision) should now have raft-consensus in its topicKeys
    const updatedRevisionDay = await Day.findById(dayRevision._id);
    expect(updatedRevisionDay.topicKeys).toContain('raft-consensus');
  });

  it('adds review objectives and prevents duplicate topic insertions', async () => {
    const weakConcepts = [
      {
        conceptKey: 'raft-consensus',
        conceptTitle: 'Raft Consensus Algorithm',
        mastery: 0.4
      }
    ];

    // Re-plan twice
    await replanRoadmapForWeakConcepts({ roadmapId: roadmap._id, userId: student._id, weakConcepts });
    const again = await replanRoadmapForWeakConcepts({ roadmapId: roadmap._id, userId: student._id, weakConcepts });

    // Should not duplicate topicKey in dayRevision
    const day = await Day.findById(dayRevision._id);
    const count = day.topicKeys.filter((k) => k === 'raft-consensus').length;
    expect(count).toBe(1);
  });
});

describe('Phase 8: Attempt Analysis & API Endpoints', () => {
  it('generates attempt analysis and retrieves via GET /api/attempts/:id/analysis', async () => {
    const test = await Test.create({
      workspaceId: workspace._id,
      dayId: day1._id,
      roadmapId: roadmap._id,
      title: 'Day 1 Concurrency Diagnostic',
      description: 'Concurrency Diagnostic CBT Test',
      topic: 'Concurrency',
      totalQuestions: 1,
      timeLimitMinutes: 10,
      createdBy: student._id
    });

    const q = await Question.create({
      testId: test._id,
      conceptKey: 'vector-clocks',
      concept: 'Vector Clocks',
      questionText: 'When does a vector clock increment?',
      options: ['On internal event or message send', 'Every 1ms', 'Only on restart', 'Never'],
      correctOptionIndex: 0,
      difficulty: 'hard',
      explanation: 'A vector clock increments on local internal events or sending a message.',
      order: 1
    });

    const attempt = await Attempt.create({
      testId: test._id,
      userId: student._id,
      workspaceId: workspace._id,
      dayId: day1._id,
      answers: new Map([[q._id.toString(), 1]]), // wrong answer
      status: 'submitted',
      score: 0,
      maxScore: 1,
      accuracy: 0
    });

    const res = await request(app)
      .get(`/api/attempts/${attempt._id}/analysis`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.analysis).toBeTruthy();
    expect(res.body.analysis.attemptId.toString()).toBe(attempt._id.toString());
    expect(res.body.analysis.masteryDelta).toHaveLength(1);
    expect(res.body.analysis.summary).toBeTruthy();
    expect(res.body.analysis.nextSteps.length).toBeGreaterThan(0);

    // Because wrong answer was given, mastery dropped: M_new = 0.6 * 0.5 + 0.4 * 0 = 0.30 (< 0.6)
    expect(res.body.analysis.weakConcepts.length).toBe(1);
    expect(res.body.analysis.weakConcepts[0].conceptKey).toBe('vector-clocks');

    // Forbidden test: other student cannot read analysis
    const unauthRes = await request(app)
      .get(`/api/attempts/${attempt._id}/analysis`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(unauthRes.status).toBe(403);
  });

  it('retrieves workspace concept mastery via GET /api/workspaces/:id/mastery', async () => {
    await ConceptMastery.create({
      ownerId: student._id,
      workspaceId: workspace._id,
      conceptKey: 'raft-consensus',
      conceptTitle: 'Raft Consensus',
      mastery: 0.85,
      attempts: 3
    });

    const res = await request(app)
      .get(`/api/workspaces/${workspace._id}/mastery`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);
    expect(res.body.concepts[0].conceptKey).toBe('raft-consensus');
    expect(res.body.concepts[0].mastery).toBe(0.85);

    // Forbidden test for unauthorized workspace access
    const forbiddenRes = await request(app)
      .get(`/api/workspaces/${workspace._id}/mastery`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(forbiddenRes.status).toBe(403);
  });

  it('retrieves roadmap changes via GET /api/roadmaps/:id/changes', async () => {
    roadmap.version = 2;
    roadmap.changeLog = [
      {
        version: 2,
        change: 'Added revision topics for Raft Consensus',
        reason: 'Mastery dropped below 60%',
        at: new Date()
      }
    ];
    await roadmap.save();

    const res = await request(app)
      .get(`/api/roadmaps/${roadmap._id}/changes`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.version).toBe(2);
    expect(res.body.changeLog).toHaveLength(1);

    // Forbidden test for unauthorized student
    const forbiddenRes = await request(app)
      .get(`/api/roadmaps/${roadmap._id}/changes`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(forbiddenRes.status).toBe(403);
  });

  it('cascades deletion of ConceptMastery and Analysis when workspace is deleted', async () => {
    await ConceptMastery.create({
      ownerId: student._id,
      workspaceId: workspace._id,
      conceptKey: 'raft-consensus',
      conceptTitle: 'Raft Consensus',
      mastery: 0.85,
      attempts: 3
    });

    await Analysis.create({
      ownerId: student._id,
      workspaceId: workspace._id,
      attemptId: new mongoose.Types.ObjectId(),
      summary: 'Summary text here',
      weakConcepts: [],
      strengths: [],
      nextSteps: ['Review notes'],
      masteryDelta: [],
      source: 'fallback'
    });

    const deleteRes = await request(app)
      .delete(`/api/workspaces/${workspace._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);

    const masteries = await ConceptMastery.find({ workspaceId: workspace._id });
    expect(masteries).toHaveLength(0);

    const analyses = await Analysis.find({ workspaceId: workspace._id });
    expect(analyses).toHaveLength(0);
  });
});
