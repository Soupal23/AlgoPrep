import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { runSeed } from '../src/seeds/seed.js';
import { resetUserRateLimit } from '../src/middleware/rateLimiter.js';

let mongoServer;
let token;
let userId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await runSeed();

  const loginRes = await supertest(app)
    .post('/api/auth/login')
    .send({ email: 'student@algoprep.com', password: 'password123' });

  token = loginRes.body.accessToken;
  userId = loginRes.body.user.id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Phase 2 — AI Syllabus-to-Test Generator', () => {
  it('should reject file upload with unsupported mimetype (e.g. image/png)', async () => {
    const res = await supertest(app)
      .post('/api/ai/generate')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('fake image content'), {
        filename: 'test_image.png',
        contentType: 'image/png'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid file type/i);
  });

  it('should generate an AI test from a text syllabus upload', async () => {
    resetUserRateLimit(userId);

    const sampleSyllabus = `
      Advanced Distributed Systems Syllabus:
      1. Consensus Protocols: Paxos, Raft, Byzantine Fault Tolerance.
      2. Vector Clocks and Lamport Timestamps for causal ordering.
      3. Distributed Hash Tables (DHT) and Chord Protocol.
      4. Two-Phase Commit (2PC) vs Three-Phase Commit (3PC).
    `;

    const res = await supertest(app)
      .post('/api/ai/generate')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(sampleSyllabus), {
        filename: 'syllabus.txt',
        contentType: 'text/plain'
      })
      .field('topicName', 'Distributed Systems')
      .field('numQuestions', '10');

    expect(res.status).toBe(201);
    expect(res.body.test).toBeDefined();
    expect(res.body.test.isAIGenerated).toBe(true);
    expect(res.body.test.totalQuestions).toBe(10);
    expect(res.body.test.timeLimitMinutes).toBe(30);

    // Verify generated test is playable end-to-end in Phase 1 engine
    const startRes = await supertest(app)
      .post(`/api/tests/${res.body.test._id}/start`)
      .set('Authorization', `Bearer ${token}`);

    expect(startRes.status).toBe(200);
    expect(startRes.body.questions).toHaveLength(10);
  }, 30000);

  it('should enforce rate limiting of 5 requests per hour per user ID', async () => {
    resetUserRateLimit(userId);

    const sampleText = 'Computer Science Algorithms: Dynamic Programming, Graph Traversal, Network Flow.';

    // Send 5 valid requests
    for (let i = 0; i < 5; i++) {
      const res = await supertest(app)
        .post('/api/ai/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ syllabusText: sampleText, topicName: `Topic ${i}` });

      expect(res.status).toBe(201);
    }

    // 6th request should be rate limited (429 Too Many Requests)
    const rateLimitedRes = await supertest(app)
      .post('/api/ai/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ syllabusText: sampleText });

    expect(rateLimitedRes.status).toBe(429);
    expect(rateLimitedRes.body.error).toMatch(/Rate limit exceeded/i);

    // Clean up rate limit state for other tests
    resetUserRateLimit(userId);
  }, 120000);

  it('should ensure AI-generated tests are private to the creator and hidden from other students', async () => {
    resetUserRateLimit(userId);

    // 1. Generate an AI test as student A
    const genRes = await supertest(app)
      .post('/api/ai/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ syllabusText: 'Operating Systems: Semaphores, Mutexes, Deadlock Detection.', topicName: 'OS Private' });

    expect(genRes.status).toBe(201);
    const aiTestId = genRes.body.test._id;

    // 2. Student A should see it in GET /api/tests
    const studentATestsRes = await supertest(app)
      .get('/api/tests')
      .set('Authorization', `Bearer ${token}`);

    expect(studentATestsRes.status).toBe(200);
    const studentATestIds = studentATestsRes.body.tests.map(t => t._id.toString());
    expect(studentATestIds).toContain(aiTestId.toString());

    // 3. Register & login as Student B (a different student)
    const studentBRegRes = await supertest(app)
      .post('/api/auth/signup')
      .send({ name: 'Student B', email: 'student2@algoprep.com', password: 'password123' });

    const studentBToken = studentBRegRes.body.accessToken;

    // 4. Student B should NOT see Student A's AI test in GET /api/tests
    const studentBTestsRes = await supertest(app)
      .get('/api/tests')
      .set('Authorization', `Bearer ${studentBToken}`);

    expect(studentBTestsRes.status).toBe(200);
    const studentBTestIds = studentBTestsRes.body.tests.map(t => t._id.toString());
    expect(studentBTestIds).not.toContain(aiTestId.toString());

    // 5. Student B trying to start Student A's AI test should get 403 Forbidden
    const forbiddenStartRes = await supertest(app)
      .post(`/api/tests/${aiTestId}/start`)
      .set('Authorization', `Bearer ${studentBToken}`);

    expect(forbiddenStartRes.status).toBe(403);
    expect(forbiddenStartRes.body.error).toMatch(/private/i);

    // 6. Requesting a leaderboard for any AI test should return 400 Bad Request (AI tests do not have leaderboards)
    const aiLeaderboardRes = await supertest(app)
      .get(`/api/leaderboard?testId=${aiTestId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(aiLeaderboardRes.status).toBe(400);
    expect(aiLeaderboardRes.body.error).toMatch(/do not have leaderboards/i);
  }, 30000);
});
