import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Test } from '../src/models/Test.js';
import { Membership } from '../src/models/Membership.js';
import { generateAccessToken } from '../src/utils/jwt.js';

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
  await Membership.deleteMany({});
});

describe('Phase 10 — Teacher-Owned, Time-Limited Tests', () => {
  it('should block expired test start requests server-side', async () => {
    const teacher = await User.create({
      name: 'Teacher One',
      email: 'teacher@test.com',
      password: 'password123',
      role: 'teacher',
      isActive: true
    });

    const student = await User.create({
      name: 'Student One',
      email: 'student@test.com',
      password: 'password123',
      role: 'student',
      isActive: true
    });

    await Membership.create({ studentId: student._id, teacherId: teacher._id });

    // Expired test (ended yesterday)
    const expiredTest = await Test.create({
      title: 'Expired Quiz',
      description: 'Past quiz',
      topic: 'Algorithms',
      timeLimitMinutes: 15,
      teacherId: teacher._id,
      validFrom: new Date(Date.now() - 48 * 3600 * 1000),
      validUntil: new Date(Date.now() - 24 * 3600 * 1000)
    });

    const studentToken = generateAccessToken({
      userId: student._id.toString(),
      email: student.email,
      role: 'student',
      isActive: true
    });

    const res = await request(app)
      .post(`/api/tests/${expiredTest._id}/start`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Test window has expired');
  });

  it('should block future test start requests server-side', async () => {
    const teacher = await User.create({
      name: 'Teacher One',
      email: 'teacher@test.com',
      password: 'password123',
      role: 'teacher',
      isActive: true
    });

    const student = await User.create({
      name: 'Student One',
      email: 'student@test.com',
      password: 'password123',
      role: 'student',
      isActive: true
    });

    await Membership.create({ studentId: student._id, teacherId: teacher._id });

    // Future test (starts tomorrow)
    const futureTest = await Test.create({
      title: 'Future Exam',
      description: 'Upcoming exam',
      topic: 'Math',
      timeLimitMinutes: 30,
      teacherId: teacher._id,
      validFrom: new Date(Date.now() + 24 * 3600 * 1000),
      validUntil: new Date(Date.now() + 48 * 3600 * 1000)
    });

    const studentToken = generateAccessToken({
      userId: student._id.toString(),
      email: student.email,
      role: 'student',
      isActive: true
    });

    const res = await request(app)
      .post(`/api/tests/${futureTest._id}/start`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Test is not available yet');
  });

  it('should enforce membership gating for teacher private tests', async () => {
    const teacher = await User.create({
      name: 'Teacher One',
      email: 'teacher@test.com',
      password: 'password123',
      role: 'teacher',
      isActive: true
    });

    const nonMember = await User.create({
      name: 'Non Member',
      email: 'nonmember@test.com',
      password: 'password123',
      role: 'student',
      isActive: true
    });

    const privateTest = await Test.create({
      title: 'Private Class Quiz',
      description: 'Exclusive to members',
      topic: 'CS101',
      timeLimitMinutes: 20,
      teacherId: teacher._id,
      validFrom: new Date(Date.now() - 3600 * 1000),
      validUntil: new Date(Date.now() + 3600 * 1000)
    });

    const nonMemberToken = generateAccessToken({
      userId: nonMember._id.toString(),
      email: nonMember.email,
      role: 'student',
      isActive: true
    });

    // Non-member attempt -> 403 Forbidden
    const res = await request(app)
      .post(`/api/tests/${privateTest._id}/start`)
      .set('Authorization', `Bearer ${nonMemberToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('must join this teacher');
  });

  it('should allow platform-seeded test start for any student', async () => {
    const student = await User.create({
      name: 'Student Any',
      email: 'any@student.com',
      password: 'password123',
      role: 'student',
      isActive: true
    });

    const platformTest = await Test.create({
      title: 'Platform Public Test',
      description: 'Seeded test',
      topic: 'DSA',
      timeLimitMinutes: 15,
      teacherId: null
    });

    const token = generateAccessToken({
      userId: student._id.toString(),
      email: student.email,
      role: 'student',
      isActive: true
    });

    const res = await request(app)
      .post(`/api/tests/${platformTest._id}/start`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.test.title).toBe('Platform Public Test');
  });
});
