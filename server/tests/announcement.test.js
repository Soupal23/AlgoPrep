import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Membership } from '../src/models/Membership.js';
import { Announcement } from '../src/models/Announcement.js';
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
  await Membership.deleteMany({});
  await Announcement.deleteMany({});
});

describe('Phase 9 — Scoped Announcements', () => {
  it('should deliver announcements only to joined students in aggregated feed', async () => {
    const teacherA = await User.create({
      name: 'Prof Alpha',
      email: 'alpha@teacher.com',
      password: 'password123',
      role: 'teacher',
      isActive: true
    });

    const teacherB = await User.create({
      name: 'Prof Beta',
      email: 'beta@teacher.com',
      password: 'password123',
      role: 'teacher',
      isActive: true
    });

    const student = await User.create({
      name: 'Student Sam',
      email: 'sam@student.com',
      password: 'password123',
      role: 'student',
      isActive: true
    });

    const teacherAToken = generateAccessToken({
      userId: teacherA._id.toString(),
      email: teacherA.email,
      role: 'teacher',
      isActive: true
    });

    const teacherBToken = generateAccessToken({
      userId: teacherB._id.toString(),
      email: teacherB.email,
      role: 'teacher',
      isActive: true
    });

    const studentToken = generateAccessToken({
      userId: student._id.toString(),
      email: student.email,
      role: 'student',
      isActive: true
    });

    // 1. Both teachers post announcements
    await request(app)
      .post('/api/announcements')
      .set('Authorization', `Bearer ${teacherAToken}`)
      .send({ title: 'Alpha Update', content: 'Welcome to Alpha Class' });

    await request(app)
      .post('/api/announcements')
      .set('Authorization', `Bearer ${teacherBToken}`)
      .send({ title: 'Beta Update', content: 'Welcome to Beta Class' });

    // 2. Student (not joined to any teacher yet) fetches feed -> should be empty
    const emptyFeedRes = await request(app)
      .get('/api/announcements/feed')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(emptyFeedRes.status).toBe(200);
    expect(emptyFeedRes.body.announcements.length).toBe(0);

    // 3. Student joins Teacher A only
    await Membership.create({ studentId: student._id, teacherId: teacherA._id });

    // 4. Student fetches feed -> sees Alpha announcement only
    const alphaFeedRes = await request(app)
      .get('/api/announcements/feed')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(alphaFeedRes.status).toBe(200);
    expect(alphaFeedRes.body.announcements.length).toBe(1);
    expect(alphaFeedRes.body.announcements[0].title).toBe('Alpha Update');

    // 5. Student joins Teacher B as well
    await Membership.create({ studentId: student._id, teacherId: teacherB._id });

    // 6. Student fetches feed -> sees both announcements
    const fullFeedRes = await request(app)
      .get('/api/announcements/feed')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(fullFeedRes.status).toBe(200);
    expect(fullFeedRes.body.announcements.length).toBe(2);
  });
});
