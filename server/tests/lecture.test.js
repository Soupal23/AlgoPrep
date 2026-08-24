import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Membership } from '../src/models/Membership.js';
import { RecordedLecture } from '../src/models/RecordedLecture.js';
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
  await RecordedLecture.deleteMany({});
});

describe('Phase 12 — Recorded Lectures', () => {
  it('should validate YouTube / Google Drive URLs and reject invalid video links', async () => {
    const teacher = await User.create({
      name: 'Teacher Video',
      email: 'teacher@video.com',
      password: 'password123',
      role: 'teacher',
      isActive: true
    });

    const teacherToken = generateAccessToken({
      userId: teacher._id.toString(),
      email: teacher.email,
      role: 'teacher',
      isActive: true
    });

    // Invalid URL (random site)
    const invalidRes = await request(app)
      .post('/api/lectures')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Bad Lecture',
        videoUrl: 'https://vimeo.com/123456'
      });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error).toContain('Invalid video URL');

    // Valid YouTube URL
    const validYtRes = await request(app)
      .post('/api/lectures')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'DSA Lecture 1',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      });

    expect(validYtRes.status).toBe(201);
    expect(validYtRes.body.lecture.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('should enforce membership gating for student lecture access', async () => {
    const teacher = await User.create({
      name: 'Prof Feynman',
      email: 'feynman@physics.com',
      password: 'password123',
      role: 'teacher',
      isActive: true
    });

    const enrolledStudent = await User.create({
      name: 'Enrolled Student',
      email: 'enrolled@student.com',
      password: 'password123',
      role: 'student',
      isActive: true
    });

    const nonMemberStudent = await User.create({
      name: 'NonMember Student',
      email: 'nonmember@student.com',
      password: 'password123',
      role: 'student',
      isActive: true
    });

    await Membership.create({ studentId: enrolledStudent._id, teacherId: teacher._id });

    const lecture = await RecordedLecture.create({
      teacherId: teacher._id,
      title: 'Quantum Electrodynamics',
      description: 'Introductory lecture',
      videoUrl: 'https://drive.google.com/file/d/1A2B3C4D5E6F/view',
      embedUrl: 'https://drive.google.com/file/d/1A2B3C4D5E6F/preview'
    });

    const enrolledToken = generateAccessToken({
      userId: enrolledStudent._id.toString(),
      email: enrolledStudent.email,
      role: 'student',
      isActive: true
    });

    const nonMemberToken = generateAccessToken({
      userId: nonMemberStudent._id.toString(),
      email: nonMemberStudent.email,
      role: 'student',
      isActive: true
    });

    // 1. Non-member direct API request -> 403 Forbidden
    const nonMemberRes = await request(app)
      .get(`/api/lectures/${lecture._id}`)
      .set('Authorization', `Bearer ${nonMemberToken}`);

    expect(nonMemberRes.status).toBe(403);
    expect(nonMemberRes.body.error).toContain('must join this teacher');

    // 2. Enrolled student direct API request -> 200 OK
    const enrolledRes = await request(app)
      .get(`/api/lectures/${lecture._id}`)
      .set('Authorization', `Bearer ${enrolledToken}`);

    expect(enrolledRes.status).toBe(200);
    expect(enrolledRes.body.lecture.embedUrl).toBe('https://drive.google.com/file/d/1A2B3C4D5E6F/preview');
  });
});
