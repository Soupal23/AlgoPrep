import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Test } from '../src/models/Test.js';
import { generateAccessToken, generateRefreshToken } from '../src/utils/jwt.js';

let mongoServer;

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
  await Test.deleteMany({});
});

describe('Phase 5 — RBAC & Security Verification', () => {
  it('should force role to student on public signup regardless of request body', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Hacker User',
        email: 'hacker@test.com',
        password: 'password123',
        role: 'admin'
      });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('student');

    const dbUser = await User.findOne({ email: 'hacker@test.com' });
    expect(dbUser.role).toBe('student');
  });

  it('should allow student to start test attempt but block teacher with 403', async () => {
    const studentPassword = await bcrypt.hash('password123', 10);
    const student = await User.create({
      name: 'Student One',
      email: 'student1@test.com',
      password: studentPassword,
      role: 'student',
      isActive: true
    });

    const teacher = await User.create({
      name: 'Teacher One',
      email: 'teacher1@test.com',
      password: studentPassword,
      role: 'teacher',
      isActive: true
    });

    const testItem = await Test.create({
      title: 'Sample Test',
      description: 'Test description',
      topic: 'DSA',
      timeLimitMinutes: 30,
      markingScheme: { correct: 4, incorrect: -1, unattempted: 0 },
      totalQuestions: 1,
      createdBy: teacher._id
    });

    const studentToken = generateAccessToken({
      userId: student._id.toString(),
      email: student.email,
      role: student.role,
      isActive: true
    });

    const teacherToken = generateAccessToken({
      userId: teacher._id.toString(),
      email: teacher.email,
      role: teacher.role,
      isActive: true
    });

    // Student start test -> 200 OK
    const studentRes = await request(app)
      .post(`/api/tests/${testItem._id}/start`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(studentRes.status).toBe(200);

    // Teacher start test -> 403 Forbidden
    const teacherRes = await request(app)
      .post(`/api/tests/${testItem._id}/start`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(teacherRes.status).toBe(403);
    expect(teacherRes.body.error).toContain('Forbidden');
  });

  it('should block login for deactivated users', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    await User.create({
      name: 'Deactivated User',
      email: 'disabled@test.com',
      password: hashedPassword,
      role: 'student',
      isActive: false
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'disabled@test.com', password: 'password123' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Account is deactivated');
  });

  it('should reject refresh token with 403 if user account is deactivated after login', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await User.create({
      name: 'Active User',
      email: 'active@test.com',
      password: hashedPassword,
      role: 'student',
      isActive: true
    });

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      isActive: true
    });

    user.refreshToken = refreshToken;
    await user.save();

    // Admin deactivates the user
    user.isActive = false;
    await user.save();

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Account is deactivated');
  });
});
