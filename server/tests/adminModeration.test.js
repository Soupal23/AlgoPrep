import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Test } from '../src/models/Test.js';
import { Attempt } from '../src/models/Attempt.js';
import { generateAccessToken, generateRefreshToken } from '../src/utils/jwt.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Test.deleteMany({});
  await Attempt.deleteMany({});
});

describe('Phase 13 — Admin Moderation & Soft Deactivation', () => {
  it('should allow admin to list all platform users', async () => {
    const admin = await User.create({
      name: 'Admin Boss',
      email: 'admin@algoprep.com',
      password: 'password123',
      role: 'admin',
      isActive: true
    });

    await User.create({
      name: 'Student One',
      email: 'student1@algoprep.com',
      password: 'password123',
      role: 'student',
      isActive: true
    });

    await User.create({
      name: 'Teacher One',
      email: 'teacher1@algoprep.com',
      password: 'password123',
      role: 'teacher',
      isActive: true
    });

    const adminToken = generateAccessToken({
      userId: admin._id.toString(),
      email: admin.email,
      role: 'admin',
      isActive: true
    });

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.users.length).toBe(3);
  });

  it('should soft-deactivate user, block future login/refresh, and preserve historical attempt/leaderboard data', async () => {
    const admin = await User.create({
      name: 'Admin Boss',
      email: 'admin@algoprep.com',
      password: 'password123',
      role: 'admin',
      isActive: true
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    const student = await User.create({
      name: 'Student ToDeactivate',
      email: 'deactivate@test.com',
      password: hashedPassword,
      role: 'student',
      isActive: true
    });

    const testItem = await Test.create({
      title: 'History Test',
      description: 'Historical test',
      topic: 'DSA',
      timeLimitMinutes: 15,
      markingScheme: { correct: 4, incorrect: -1, unattempted: 0 },
      totalQuestions: 1
    });

    // Student completed an attempt
    const attempt = await Attempt.create({
      userId: student._id,
      testId: testItem._id,
      startedAt: new Date(Date.now() - 300000),
      submittedAt: new Date(),
      status: 'submitted',
      score: 4,
      correctCount: 1,
      incorrectCount: 0,
      unattemptedCount: 0,
      accuracy: 100,
      totalTimeSpentSeconds: 120
    });

    const studentRefreshToken = generateRefreshToken({
      userId: student._id.toString(),
      email: student.email,
      role: 'student',
      isActive: true
    });
    student.refreshToken = studentRefreshToken;
    await student.save();

    const adminToken = generateAccessToken({
      userId: admin._id.toString(),
      email: admin.email,
      role: 'admin',
      isActive: true
    });

    // 1. Admin soft-deactivates student
    const deactivateRes = await request(app)
      .patch(`/api/admin/users/${student._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(deactivateRes.status).toBe(200);
    expect(deactivateRes.body.user.isActive).toBe(false);

    // 2. Login attempt by deactivated user -> 403 Forbidden
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'deactivate@test.com', password: 'password123' });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error).toBe('Account is deactivated');

    // 3. Refresh token attempt by deactivated user -> 403 Forbidden
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: studentRefreshToken });

    expect(refreshRes.status).toBe(403);
    expect(refreshRes.body.error).toBe('Account is deactivated');

    // 4. Historical attempt and leaderboard data integrity check
    const dbAttempt = await Attempt.findById(attempt._id).populate('userId', 'name email');
    expect(dbAttempt).not.toBeNull();
    expect(dbAttempt.userId.name).toBe('Student ToDeactivate');

    const leaderboardRes = await request(app)
      .get('/api/leaderboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(leaderboardRes.status).toBe(200);
    expect(leaderboardRes.body.leaderboard.length).toBeGreaterThanOrEqual(1);
    expect(leaderboardRes.body.leaderboard[0].user.name).toBe('Student ToDeactivate');
  });
});
