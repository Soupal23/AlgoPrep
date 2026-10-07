import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { runSeed } from '../src/seeds/seed.js';

let mongoServer;
let studentToken;
let testId;
let attemptId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await runSeed();

  const loginRes = await supertest(app)
    .post('/api/auth/login')
    .send({ email: 'student@algoprep.com', password: 'password123' });

  studentToken = loginRes.body.accessToken;

  const testRes = await supertest(app).get('/api/tests');
  testId = testRes.body.tests[0]._id;

  const startRes = await supertest(app)
    .post(`/api/tests/${testId}/start`)
    .set('Authorization', `Bearer ${studentToken}`);
  attemptId = startRes.body.attemptId;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Tiered Rate Limiter & Reverse Proxy Architecture', () => {
  it('should never rate limit health checks', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await supertest(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    }
  });

  it('should accept progress updates from student within per-user limit', async () => {
    const res = await supertest(app)
      .patch(`/api/attempts/${attemptId}/progress`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answers: {},
        questionStates: {},
        version: 1
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.headers).toHaveProperty('ratelimit');
  });

  it('should track requests with standard draft-7 headers', async () => {
    const res = await supertest(app)
      .get('/api/tests')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.headers).toHaveProperty('ratelimit');
  });
});
