import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { runSeed } from '../src/seeds/seed.js';
import { Test } from '../src/models/Test.js';
import { Question } from '../src/models/Question.js';
import { RevisionPlan } from '../src/models/RevisionPlan.js';

let mongoServer;
let token;
let otherToken;
let testId;
let attemptId;
let questions;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await runSeed();

  // Create primary student user
  const regRes = await supertest(app)
    .post('/api/auth/signup')
    .send({ name: 'Alice Student', email: 'alice@algoprep.com', password: 'password123' });
  token = regRes.body.accessToken;

  // Create another student user for unauthorized tests
  const otherRes = await supertest(app)
    .post('/api/auth/signup')
    .send({ name: 'Bob Student', email: 'bob@algoprep.com', password: 'password123' });
  otherToken = otherRes.body.accessToken;

  // Retrieve a test
  const testRes = await supertest(app).get('/api/tests');
  testId = testRes.body.tests[0]._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Revision Plan API Endpoints & Lifecycle', { timeout: 30000 }, () => {
  it('should start a test attempt and reject revision plan before submission', async () => {
    const startRes = await supertest(app)
      .post(`/api/tests/${testId}/start`)
      .set('Authorization', `Bearer ${token}`);

    expect(startRes.status).toBe(200);
    attemptId = startRes.body.attemptId;
    questions = startRes.body.questions;

    // Revision plan on an in-progress attempt should be rejected
    const planRes = await supertest(app)
      .get(`/api/attempts/${attemptId}/ai-revision`)
      .set('Authorization', `Bearer ${token}`);

    expect(planRes.status).toBe(400);
    expect(planRes.body.error).toMatch(/unsubmitted/i);
  });

  it('should track questionTimeSpent in saveProgress and submitAttempt', async () => {
    const q0Id = questions[0]._id;
    const q1Id = questions[1]._id;

    const saveRes = await supertest(app)
      .patch(`/api/attempts/${attemptId}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        answers: { [q0Id]: 0, [q1Id]: 1 },
        questionStates: { [q0Id]: 'answered', [q1Id]: 'marked' },
        questionTimeSpent: { [q0Id]: 45, [q1Id]: 12 },
        version: 1
      });

    expect(saveRes.status).toBe(200);

    const submitRes = await supertest(app)
      .post(`/api/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        answers: { [q0Id]: 0, [q1Id]: 1 },
        questionStates: { [q0Id]: 'answered', [q1Id]: 'marked' },
        questionTimeSpent: { [q0Id]: 50, [q1Id]: 15 },
        version: 2
      });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.attempt.status).toBe('submitted');
  });

  it('should generate, validate, and persist structured revision plan on first request', async () => {
    const res = await supertest(app)
      .get(`/api/attempts/${attemptId}/ai-revision`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.plan).toBeDefined();
    expect(res.body.plan.summary).toBeDefined();
    expect(res.body.plan.summary.verdict).toBeDefined();
    expect(res.body.plan.summary.performanceLevel).toBeDefined();
    expect(res.body.plan.stats).toBeDefined();
    expect(res.body.plan.conceptBreakdown).toBeInstanceOf(Array);
    expect(res.body.canRegenerate).toBe(true);

    // Verify it is saved in MongoDB
    const savedInDb = await RevisionPlan.findOne({ attemptId });
    expect(savedInDb).not.toBeNull();
    expect(savedInDb.schemaVersion).toBe(1);
  });

  it('should return the cached saved plan on subsequent GET requests without re-generating', async () => {
    const firstFetch = await supertest(app)
      .get(`/api/attempts/${attemptId}/ai-revision`)
      .set('Authorization', `Bearer ${token}`);

    const secondFetch = await supertest(app)
      .get(`/api/attempts/${attemptId}/ai-revision`)
      .set('Authorization', `Bearer ${token}`);

    expect(firstFetch.status).toBe(200);
    expect(secondFetch.status).toBe(200);
    expect(secondFetch.body.generatedAt).toBe(firstFetch.body.generatedAt);
    expect(secondFetch.body.plan.summary.verdict).toBe(firstFetch.body.plan.summary.verdict);
  });

  it('should enforce access control: forbid other students from accessing the plan', async () => {
    const res = await supertest(app)
      .get(`/api/attempts/${attemptId}/ai-revision`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });

  it('should verify tag-on-first-use automatically populated concepts and difficulties', async () => {
    const testDoc = await Test.findById(testId);
    expect(testDoc.conceptTagging.status).toBe('done');

    const testQuestions = await Question.find({ testId });
    for (const q of testQuestions) {
      expect(q.concept).toBeTruthy();
      expect(['easy', 'medium', 'hard']).toContain(q.difficulty);
    }
  });

  it('should enforce maximum regeneration limit (3 regenerations)', async () => {
    // Manually set regenerateCount to 2 to test transition and limit enforcement
    await RevisionPlan.updateOne({ attemptId }, { $set: { regenerateCount: 2 } });

    // 3rd regeneration
    const regen3 = await supertest(app)
      .post(`/api/attempts/${attemptId}/ai-revision/regenerate`)
      .set('Authorization', `Bearer ${token}`);

    // If Gemini key is mock or unavailable, it gracefully returns 503 while preserving plan
    if (regen3.status === 200) {
      expect(regen3.body.canRegenerate).toBe(false);

      // 4th regeneration attempt should be strictly rejected with 400
      const regen4 = await supertest(app)
        .post(`/api/attempts/${attemptId}/ai-revision/regenerate`)
        .set('Authorization', `Bearer ${token}`);

      expect(regen4.status).toBe(400);
      expect(regen4.body.error).toMatch(/Maximum revision plan regenerations/i);
    } else {
      expect([200, 503]).toContain(regen3.status);
    }
  });
});
