import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { Test } from '../src/models/Test.js';
import { Attempt } from '../src/models/Attempt.js';

let mongoServer;
let testDoc;
let user1Token, user1Id;
let user2Token, user2Id;
let user3Token, user3Id;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Create Test
  testDoc = await Test.create({
    title: 'Phase 3 Verification Test',
    description: 'Testing leaderboard aggregation and tie-breaking rules',
    topic: 'Computer Networks',
    timeLimitMinutes: 30,
    markingScheme: { correct: 4, incorrect: -1 },
    totalQuestions: 15
  });

  // Sign up 3 candidates via Auth API
  const s1 = await supertest(app).post('/api/auth/signup').send({ name: 'Alice Student', email: 'alice@algoprep.com', password: 'password123' });
  const s2 = await supertest(app).post('/api/auth/signup').send({ name: 'Bob Fast', email: 'bob@algoprep.com', password: 'password123' });
  const s3 = await supertest(app).post('/api/auth/signup').send({ name: 'Charlie Slow', email: 'charlie@algoprep.com', password: 'password123' });

  user1Token = s1.body.accessToken;
  user1Id = s1.body.user.id;

  user2Token = s2.body.accessToken;
  user2Id = s2.body.user.id;

  user3Token = s3.body.accessToken;
  user3Id = s3.body.user.id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Phase 3 — Leaderboard, Percentile & Tie-Breaker Aggregation', () => {
  it('should rank 3 candidates correctly and resolve ties by lower time spent', async () => {
    // 1. Candidate 1 (Alice) completes test: Score 40, Time 300s
    const a1Res = await supertest(app).post(`/api/tests/${testDoc._id}/start`).set('Authorization', `Bearer ${user1Token}`);
    const att1Id = a1Res.body.attemptId;
    await supertest(app)
      .post(`/api/attempts/${att1Id}/submit`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ timeSpentSeconds: 300 });

    await Attempt.findByIdAndUpdate(att1Id, { score: 40, maxScore: 60, accuracy: 66.7, timeSpentSeconds: 300, status: 'submitted' });

    // 2. Candidate 2 (Bob) completes test: TIE on Score (40), but FASTER Time (180s)
    const a2Res = await supertest(app).post(`/api/tests/${testDoc._id}/start`).set('Authorization', `Bearer ${user2Token}`);
    const att2Id = a2Res.body.attemptId;
    await supertest(app)
      .post(`/api/attempts/${att2Id}/submit`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ timeSpentSeconds: 180 });

    await Attempt.findByIdAndUpdate(att2Id, { score: 40, maxScore: 60, accuracy: 66.7, timeSpentSeconds: 180, status: 'submitted' });

    // 3. Candidate 3 (Charlie) completes test: Lower Score (20), Time 200s
    const a3Res = await supertest(app).post(`/api/tests/${testDoc._id}/start`).set('Authorization', `Bearer ${user3Token}`);
    const att3Id = a3Res.body.attemptId;
    await supertest(app)
      .post(`/api/attempts/${att3Id}/submit`)
      .set('Authorization', `Bearer ${user3Token}`)
      .send({ timeSpentSeconds: 200 });

    await Attempt.findByIdAndUpdate(att3Id, { score: 20, maxScore: 60, accuracy: 33.3, timeSpentSeconds: 200, status: 'submitted' });

    // Query Leaderboard for Bob (Candidate 2)
    const lbRes = await supertest(app)
      .get(`/api/leaderboard?testId=${testDoc._id}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(lbRes.status).toBe(200);
    expect(lbRes.body.totalParticipants).toBe(3);

    const board = lbRes.body.leaderboard;
    expect(board).toHaveLength(3);

    // Rank 1: Bob (Score 40, Time 180s) -> Tie winner!
    expect(board[0].user.name).toBe('Bob Fast');
    expect(board[0].rank).toBe(1);
    expect(board[0].timeSpentSeconds).toBe(180);

    // Rank 2: Alice (Score 40, Time 300s) -> Slower time
    expect(board[1].user.name).toBe('Alice Student');
    expect(board[1].rank).toBe(2);

    // Rank 3: Charlie (Score 20, Time 200s) -> Lower score
    expect(board[2].user.name).toBe('Charlie Slow');
    expect(board[2].rank).toBe(3);

    // Verify Bob's myStats calculation (Percentile = 100%)
    expect(lbRes.body.myStats.rank).toBe(1);
    expect(lbRes.body.myStats.percentile).toBe(100);
  });

  it('should fetch user attempt history under profile', async () => {
    const historyRes = await supertest(app)
      .get('/api/attempts/user/my-attempts')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.attempts).toHaveLength(1);
    expect(historyRes.body.attempts[0].score).toBe(40);
  });
});
