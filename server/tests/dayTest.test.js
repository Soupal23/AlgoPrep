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
import { Job } from '../src/models/Job.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { llmGateway } from '../src/ai/llmGateway.js';
import { retriever } from '../src/ai/retriever.js';
import {
  shuffleOptionsAndFixIndex,
  getOrGenerateDayTest,
  generateFinalMock
} from '../src/services/testGenerationService.js';

let mongoServer;
let student, token;
let otherStudent, otherToken;
let workspace, roadmap, day1, dayMock;

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
  await Job.deleteMany({});

  vi.spyOn(retriever, 'retrieve').mockResolvedValue([
    {
      chunkId: new mongoose.Types.ObjectId(),
      materialName: 'OS Lecture 4',
      text: 'Peterson solution provides mutual exclusion using turn and flag variables.'
    }
  ]);

  // Seed primary student
  student = await User.create({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    password: 'password123',
    role: 'student'
  });
  token = generateAccessToken({
    userId: student._id.toString(),
    email: student.email,
    role: student.role
  });

  // Seed secondary student
  otherStudent = await User.create({
    name: 'Charles Babbage',
    email: 'charles@example.com',
    password: 'password123',
    role: 'student'
  });
  otherToken = generateAccessToken({
    userId: otherStudent._id.toString(),
    email: otherStudent.email,
    role: otherStudent.role
  });

  // Seed workspace
  workspace = await Workspace.create({
    ownerId: student._id,
    title: 'Operating Systems & Concurrency',
    subject: 'Computer Science',
    description: 'Semaphores, Mutexes, and Thread Scheduling'
  });

  // Seed roadmap
  roadmap = await Roadmap.create({
    workspaceId: workspace._id,
    ownerId: student._id,
    title: 'Operating Systems Roadmap',
    topics: [
      {
        key: 'process-sync',
        title: 'Process Synchronization and Race Conditions',
        description: 'Critical section problem, atomic instructions, and Peterson algorithm.',
        difficulty: 'medium',
        estMinutes: 60
      },
      {
        key: 'deadlocks',
        title: 'Deadlock Detection and Prevention',
        description: 'Resource allocation graphs, Banker algorithm, and Coffman conditions.',
        difficulty: 'hard',
        estMinutes: 80
      }
    ],
    status: 'ready'
  });

  // Seed learn day
  day1 = await Day.create({
    roadmapId: roadmap._id,
    workspaceId: workspace._id,
    ownerId: student._id,
    dayNumber: 1,
    title: 'Process Synchronization',
    objectives: ['Master critical sections', 'Derive Peterson algorithm correctness'],
    topicKeys: ['process-sync'],
    estMinutes: 60,
    type: 'learn',
    status: 'available',
    content: {
      notesStatus: 'ready',
      resourcesStatus: 'ready',
      testStatus: 'pending'
    }
  });

  // Seed mock exam day
  dayMock = await Day.create({
    roadmapId: roadmap._id,
    workspaceId: workspace._id,
    ownerId: student._id,
    dayNumber: 2,
    title: 'Comprehensive Final Mock Examination',
    objectives: ['Full course accreditation exam under timed conditions'],
    topicKeys: ['process-sync', 'deadlocks'],
    estMinutes: 120,
    type: 'mock',
    status: 'locked',
    content: {
      notesStatus: 'ready',
      resourcesStatus: 'ready',
      testStatus: 'pending'
    }
  });

  // Mock LLM test question generation
  vi.spyOn(llmGateway, 'generateObject').mockImplementation(async () => {
    return {
      data: {
        questions: [
          {
            questionText: 'What invariant must be satisfied for Peterson solution to guarantee mutual exclusion?',
            options: [
              'Both flag[i] is true and turn == j',
              'Only turn == i regardless of flag states',
              'Strict hardware disabling of processor interrupts',
              'Non-blocking spinlock with unbounded FIFO queues'
            ],
            correctOptionIndex: 0,
            explanation: 'Peterson solution sets flag[i]=true and turn=j; process i waits while flag[j] is true and turn==j.',
            conceptKey: 'process-sync',
            difficulty: 'medium',
            bloomLevel: 'understand'
          },
          {
            questionText: 'Which of the following conditions is NOT one of the four necessary Coffman conditions for deadlock?',
            options: [
              'Preemptive resource revocation by OS scheduler',
              'Mutual exclusion',
              'Hold and wait',
              'Circular wait'
            ],
            correctOptionIndex: 0,
            explanation: 'Preemption breaks deadlock. The four Coffman conditions are mutual exclusion, hold and wait, no preemption, and circular wait.',
            conceptKey: 'process-sync',
            difficulty: 'easy',
            bloomLevel: 'remember'
          },
          {
            questionText: 'What is the primary drawback of using spinlocks on single-core uniprocessor systems?',
            options: [
              'Wastes CPU clock cycles spinning while waiting for a preempted thread',
              'Causes guaranteed kernel panics upon thread context switch',
              'Prevents memory caches from maintaining coherency',
              'Eliminates atomic test-and-set hardware instructions'
            ],
            correctOptionIndex: 0,
            explanation: 'On a uniprocessor system, spinning wastes processor time because the thread holding the lock cannot execute until the spinning thread is preempted.',
            conceptKey: 'process-sync',
            difficulty: 'hard',
            bloomLevel: 'analyze'
          },
          {
            questionText: 'How does the compare-and-swap (CAS) instruction enforce lock-free synchronization?',
            options: [
              'Atomically updates a memory location only if its current value matches an expected operand',
              'Disables all hardware timer interrupts across every core',
              'Replaces instruction pipelines with speculative branch prediction',
              'Locks the PCIe peripheral bus indefinitely'
            ],
            correctOptionIndex: 0,
            explanation: 'CAS atomically compares the contents of a memory location with an expected value and modifies it only if they match.',
            conceptKey: 'process-sync',
            difficulty: 'medium',
            bloomLevel: 'apply'
          }
        ]
      }
    };
  });
});

describe('Phase 7 — Option Shuffling & Positional Bias Elimination', () => {
  it('correctly tracks the correct answer after shuffling options', () => {
    const originalOptions = ['A: Correct Option', 'B: Distractor 1', 'C: Distractor 2', 'D: Distractor 3'];
    const correctIndex = 0;
    const correctText = originalOptions[correctIndex];

    const { options: shuffledOptions, correctOptionIndex: newIndex } = shuffleOptionsAndFixIndex(
      originalOptions,
      correctIndex
    );

    expect(shuffledOptions).toHaveLength(4);
    expect(shuffledOptions[newIndex]).toBe(correctText);
  });
});

describe('Phase 7 — Test Generation Service', () => {
  it('generates a grounded CBT day test with conceptKey, bloomLevel, and practice mode', async () => {
    const result = await getOrGenerateDayTest({
      dayId: day1._id.toString(),
      userId: student._id.toString(),
      force: false
    });

    expect(result).toBeDefined();
    expect(result.test).toBeDefined();
    expect(result.test.kind).toBe('day');
    expect(result.test.mode).toBe('practice');
    expect(result.test.dayId.toString()).toBe(day1._id.toString());
    expect(result.test.workspaceId.toString()).toBe(workspace._id.toString());
    expect(result.test.markingScheme.correct).toBe(4);
    expect(result.test.markingScheme.incorrect).toBe(-1);

    // Verify questions in DB
    const questions = await Question.find({ testId: result.test._id }).sort({ order: 1 });
    expect(questions.length).toBeGreaterThanOrEqual(4);

    for (const q of questions) {
      expect(q.conceptKey).toBe('process-sync');
      expect(['remember', 'understand', 'apply', 'analyze']).toContain(q.bloomLevel);
      expect(q.options).toHaveLength(4);
      expect(q.type).toBe('mcq_single');
      expect(q.correctOptionIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctOptionIndex).toBeLessThanOrEqual(3);
    }

    // Verify Day content status updated to ready
    const updatedDay = await Day.findById(day1._id);
    expect(updatedDay.content.testStatus).toBe('ready');
  });

  it('reuses existing test on subsequent calls without regenerating (caching)', async () => {
    const first = await getOrGenerateDayTest({
      dayId: day1._id.toString(),
      userId: student._id.toString(),
      force: false
    });

    const second = await getOrGenerateDayTest({
      dayId: day1._id.toString(),
      userId: student._id.toString(),
      force: false
    });

    expect(second.cached).toBe(true);
    expect(second.test._id.toString()).toBe(first.test._id.toString());
  });

  it('generates a final mock test in exam mode with proctoring defaults', async () => {
    const result = await generateFinalMock({
      roadmapId: roadmap._id.toString(),
      userId: student._id.toString()
    });

    expect(result.test).toBeDefined();
    expect(result.test.kind).toBe('final_mock');
    expect(result.test.mode).toBe('exam');
    expect(result.questionsCount).toBeGreaterThanOrEqual(6);
  });
});

describe('Phase 7 — CBT Engine Practice vs Exam Mode Integration', () => {
  it('does NOT apply 600s time penalty on tab switch when test mode is practice', async () => {
    // 1. Generate practice test
    const { test } = await getOrGenerateDayTest({
      dayId: day1._id.toString(),
      userId: student._id.toString(),
      force: false
    });

    // 2. Start attempt
    const startRes = await request(app)
      .post(`/api/tests/${test._id}/start`)
      .set('Authorization', `Bearer ${token}`);

    expect(startRes.status).toBe(200);
    const attemptId = startRes.body.attemptId;

    // 3. Save progress with a tab switch event
    const saveRes = await request(app)
      .patch(`/api/attempts/${attemptId}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        answers: {},
        version: 1,
        tabSwitchEvent: { timestamp: new Date(), reason: 'tab_switch' }
      });

    expect(saveRes.status).toBe(200);
    // In practice mode, penaltySeconds MUST remain 0!
    expect(saveRes.body.penaltySeconds).toBe(0);

    const attemptInDb = await Attempt.findById(attemptId);
    expect(attemptInDb.penaltySeconds).toBe(0);
    expect(attemptInDb.tabSwitches).toBe(1);
  });

  it('applies 600s time penalty on tab switch when test mode is exam', async () => {
    // 1. Create an exam mode test
    const examTest = await Test.create({
      title: 'Operating Systems Proctored Final',
      description: 'Strict exam',
      topic: 'Concurrency',
      timeLimitMinutes: 30,
      markingScheme: { correct: 4, incorrect: -1 },
      totalQuestions: 5,
      kind: 'final_mock',
      mode: 'exam',
      ownerId: student._id
    });

    // 2. Start attempt
    const startRes = await request(app)
      .post(`/api/tests/${examTest._id}/start`)
      .set('Authorization', `Bearer ${token}`);

    const attemptId = startRes.body.attemptId;

    // 3. Save progress with tab switch event
    const saveRes = await request(app)
      .patch(`/api/attempts/${attemptId}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        answers: {},
        version: 1,
        tabSwitchEvent: { timestamp: new Date(), reason: 'tab_switch' }
      });

    expect(saveRes.status).toBe(200);
    // In exam mode, 600s penalty IS applied
    expect(saveRes.body.penaltySeconds).toBe(600);
  });
});

describe('Phase 7 — API Endpoints, Review with Metadata & Cascading Delete', () => {
  it('POST /api/days/:dayId/test?sync=true generates and returns test for day owner', async () => {
    const res = await request(app)
      .post(`/api/days/${day1._id}/test?sync=true`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.testId).toBeDefined();
    expect(res.body.test.kind).toBe('day');
  });

  it('POST /api/days/:dayId/test returns 403 Forbidden for another student', async () => {
    const res = await request(app)
      .post(`/api/days/${day1._id}/test`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/attempts/:id/review includes conceptKey and bloomLevel in question review', async () => {
    const { test } = await getOrGenerateDayTest({
      dayId: day1._id.toString(),
      userId: student._id.toString(),
      force: false
    });

    const startRes = await request(app)
      .post(`/api/tests/${test._id}/start`)
      .set('Authorization', `Bearer ${token}`);

    const attemptId = startRes.body.attemptId;

    // Submit attempt
    await request(app)
      .post(`/api/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        answers: {},
        version: 1
      });

    // Review attempt
    const reviewRes = await request(app)
      .get(`/api/attempts/${attemptId}/review`)
      .set('Authorization', `Bearer ${token}`);

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.questions).toBeDefined();
    expect(reviewRes.body.questions.length).toBeGreaterThan(0);

    const firstQ = reviewRes.body.questions[0];
    expect(firstQ.conceptKey).toBe('process-sync');
    expect(firstQ.bloomLevel).toBeDefined();
  });

  it('GET /api/workspaces/:id/tests returns all tests for workspace', async () => {
    await getOrGenerateDayTest({
      dayId: day1._id.toString(),
      userId: student._id.toString(),
      force: false
    });

    const res = await request(app)
      .get(`/api/workspaces/${workspace._id}/tests`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tests.length).toBeGreaterThan(0);
    expect(res.body.tests[0].workspaceId.toString()).toBe(workspace._id.toString());
  });

  it('deleting workspace cascades and removes all associated tests, questions, and attempts', async () => {
    const { test } = await getOrGenerateDayTest({
      dayId: day1._id.toString(),
      userId: student._id.toString(),
      force: false
    });

    const startRes = await request(app)
      .post(`/api/tests/${test._id}/start`)
      .set('Authorization', `Bearer ${token}`);

    const attemptId = startRes.body.attemptId;

    // Verify existence
    expect(await Test.countDocuments({ workspaceId: workspace._id })).toBe(1);
    expect(await Question.countDocuments({ testId: test._id })).toBeGreaterThan(0);
    expect(await Attempt.countDocuments({ _id: attemptId })).toBe(1);

    // Delete workspace
    const delRes = await request(app)
      .delete(`/api/workspaces/${workspace._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(delRes.status).toBe(200);

    // Verify cascading deletion
    expect(await Test.countDocuments({ workspaceId: workspace._id })).toBe(0);
    expect(await Question.countDocuments({ testId: test._id })).toBe(0);
    expect(await Attempt.countDocuments({ _id: attemptId })).toBe(0);
  });
});
