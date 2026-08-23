import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { runSeed } from '../src/seeds/seed.js';

let mongoServer;
let token;
let testId;
let attemptId;
let questions;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await runSeed();

  const loginRes = await supertest(app)
    .post('/api/auth/login')
    .send({ email: 'student@algoprep.com', password: 'password123' });

  token = loginRes.body.accessToken;

  const testRes = await supertest(app).get('/api/tests');
  testId = testRes.body.tests[0]._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Test Taking Engine & Versioned State Persistence', () => {
  it('should start a new test attempt', async () => {
    const res = await supertest(app)
      .post(`/api/tests/${testId}/start`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.attemptId).toBeDefined();
    expect(res.body.questions).toHaveLength(15);
    expect(res.body.timeRemainingSeconds).toBeGreaterThan(0);

    attemptId = res.body.attemptId;
    questions = res.body.questions;
  });

  it('should save progress with monotonic version lock (version 1)', async () => {
    const q0Id = questions[0]._id;
    const q1Id = questions[1]._id;

    const res = await supertest(app)
      .patch(`/api/attempts/${attemptId}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        answers: { [q0Id]: 2, [q1Id]: 1 },
        questionStates: { [q0Id]: 'answered', [q1Id]: 'marked' },
        version: 1
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.lastSavedVersion).toBe(1);
  });

  it('should reject a stale progress patch with version 1 (<= current lastSavedVersion)', async () => {
    const q0Id = questions[0]._id;

    const res = await supertest(app)
      .patch(`/api/attempts/${attemptId}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        answers: { [q0Id]: 0 },
        questionStates: { [q0Id]: 'answered' },
        version: 1
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.reason).toBe('stale_version');
    expect(res.body.currentVersion).toBe(1);
  });

  it('should accept a newer progress patch with version 2', async () => {
    const q0Id = questions[0]._id;

    const res = await supertest(app)
      .patch(`/api/attempts/${attemptId}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        answers: { [q0Id]: 2 },
        questionStates: { [q0Id]: 'answered' },
        version: 2
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.lastSavedVersion).toBe(2);
  });

  it('should restore saved answers and question states when test is resumed / page refreshed', async () => {
    const res = await supertest(app)
      .post(`/api/tests/${testId}/start`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.attemptId).toBe(attemptId);
    expect(res.body.lastSavedVersion).toBe(2);
    expect(res.body.answers[questions[0]._id]).toBe(2);
  });

  it('should calculate score and submit attempt', async () => {
    const res = await supertest(app)
      .post(`/api/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        timeSpentSeconds: 120,
        version: 3
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/submitted/i);
    expect(res.body.attempt.status).toBe('submitted');
    expect(typeof res.body.attempt.timeSpentSeconds).toBe('number');
    expect(res.body.attempt.timeSpentSeconds).toBeGreaterThanOrEqual(0);
    expect(res.body.attempt.scoringBreakdown).toBeDefined();
  });
});
