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

  it('should only consider a user’s first attempt on the leaderboard when a user re-takes a test', async () => {
    // User 1 (Alice) re-takes the test and gets a higher score (60) with faster time (100s)
    const a1SecondRes = await supertest(app).post(`/api/tests/${testDoc._id}/start`).set('Authorization', `Bearer ${user1Token}`);
    const att1SecondId = a1SecondRes.body.attemptId;
    await supertest(app)
      .post(`/api/attempts/${att1SecondId}/submit`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ timeSpentSeconds: 100 });

    await Attempt.findByIdAndUpdate(att1SecondId, {
      score: 60,
      maxScore: 60,
      accuracy: 100,
      timeSpentSeconds: 100,
      status: 'submitted',
      startedAt: new Date(Date.now() + 10000)
    });

    const lbRes = await supertest(app)
      .get(`/api/leaderboard?testId=${testDoc._id}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(lbRes.status).toBe(200);
    // Still 3 participants, not 4
    expect(lbRes.body.totalParticipants).toBe(3);

    const aliceEntries = lbRes.body.leaderboard.filter(entry => entry.user._id === user1Id);
    // Alice should appear only ONCE in the leaderboard
    expect(aliceEntries).toHaveLength(1);
    // Alice's entry should be her FIRST attempt (score 40, time 300s), NOT her second attempt (score 60, time 100s)
    expect(aliceEntries[0].score).toBe(40);
    expect(aliceEntries[0].timeSpentSeconds).toBe(300);
  });

  it('should correctly select the 1st attempt when a candidate takes a test 3 times even if startedAt is null or missing on later attempts', async () => {
    // User 3 (Charlie) takes the test 2 more times (total 3 attempts)
    // Attempt 1: score 20 (already created in beforeAll / 1st test)
    // Attempt 2: score 8 (attempt 2 created later, set startedAt to null/undefined)
    const c2Res = await supertest(app).post(`/api/tests/${testDoc._id}/start`).set('Authorization', `Bearer ${user3Token}`);
    const c2Id = c2Res.body.attemptId;
    await Attempt.findByIdAndUpdate(c2Id, {
      score: 8,
      maxScore: 60,
      accuracy: 13.3,
      timeSpentSeconds: 14,
      status: 'submitted',
      startedAt: null
    });

    // Attempt 3: score 12
    const c3Res = await supertest(app).post(`/api/tests/${testDoc._id}/start`).set('Authorization', `Bearer ${user3Token}`);
    const c3Id = c3Res.body.attemptId;
    await Attempt.findByIdAndUpdate(c3Id, {
      score: 12,
      maxScore: 60,
      accuracy: 20,
      timeSpentSeconds: 20,
      status: 'submitted'
    });

    const lbRes = await supertest(app)
      .get(`/api/leaderboard?testId=${testDoc._id}`)
      .set('Authorization', `Bearer ${user3Token}`);

    expect(lbRes.status).toBe(200);
    const charlieEntries = lbRes.body.leaderboard.filter(entry => entry.user._id === user3Id);
    expect(charlieEntries).toHaveLength(1);
    // Charlie's entry MUST be his very first attempt (score 20), NOT attempt 2 (score 8) or attempt 3 (score 12)
    expect(charlieEntries[0].score).toBe(20);
  });
});
