import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
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
  await Membership.deleteMany({});
});

describe('Phase 8 — Class Membership (Join)', () => {
  it('should allow a student to join a teacher class idempotently', async () => {
    const teacher = await User.create({
      name: 'Teacher Smith',
      email: 'smith@teacher.com',
      password: 'password123',
      role: 'teacher',
      isActive: true
    });

    const student = await User.create({
      name: 'Student Bob',
      email: 'bob@student.com',
      password: 'password123',
      role: 'student',
      isActive: true
    });

    const studentToken = generateAccessToken({
      userId: student._id.toString(),
      email: student.email,
      role: 'student',
      isActive: true
    });

    // 1. First join call
    const joinRes1 = await request(app)
      .post(`/api/memberships/join/${teacher._id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(joinRes1.status).toBe(200);
    expect(joinRes1.body.membership.status).toBe('active');

    // 2. Duplicate join call (idempotent check)
    const joinRes2 = await request(app)
      .post(`/api/memberships/join/${teacher._id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(joinRes2.status).toBe(200);

    const count = await Membership.countDocuments({ studentId: student._id, teacherId: teacher._id });
    expect(count).toBe(1);
  });

  it('should list joined teachers for student and student roster for teacher', async () => {
    const teacher = await User.create({
      name: 'Teacher Alice',
      email: 'alice@teacher.com',
      password: 'password123',
      role: 'teacher',
      isActive: true
    });

    const student = await User.create({
      name: 'Student Charlie',
      email: 'charlie@student.com',
      password: 'password123',
      role: 'student',
      isActive: true
    });

    await Membership.create({
      studentId: student._id,
      teacherId: teacher._id
    });

    const studentToken = generateAccessToken({
      userId: student._id.toString(),
      email: student.email,
      role: 'student',
      isActive: true
    });

    const teacherToken = generateAccessToken({
      userId: teacher._id.toString(),
      email: teacher.email,
      role: 'teacher',
      isActive: true
    });

    // Student fetches joined teachers
    const myTeachersRes = await request(app)
      .get('/api/memberships/my-teachers')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(myTeachersRes.status).toBe(200);
    expect(myTeachersRes.body.teachers.length).toBe(1);
    expect(myTeachersRes.body.teachers[0].teacher.name).toBe('Teacher Alice');

    // Teacher fetches roster
    const rosterRes = await request(app)
      .get('/api/memberships/roster')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(rosterRes.status).toBe(200);
    expect(rosterRes.body.roster.length).toBe(1);
    expect(rosterRes.body.roster[0].student.name).toBe('Student Charlie');
  });

  it('should allow teacher to remove student from class roster without deleting student account', async () => {
    const teacher = await User.create({
      name: 'Teacher Bob',
      email: 'bob@teacher.com',
      password: 'password123',
      role: 'teacher',
      isActive: true
    });

    const student = await User.create({
      name: 'Student David',
      email: 'david@student.com',
      password: 'password123',
      role: 'student',
      isActive: true
    });

    await Membership.create({
      studentId: student._id,
      teacherId: teacher._id
    });

    const teacherToken = generateAccessToken({
      userId: teacher._id.toString(),
      email: teacher.email,
      role: 'teacher',
      isActive: true
    });

    // Teacher removes student
    const removeRes = await request(app)
      .delete(`/api/memberships/roster/${student._id}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(removeRes.status).toBe(200);

    const membershipExists = await Membership.findOne({ studentId: student._id, teacherId: teacher._id });
    expect(membershipExists).toBeNull();

    // Verify student account still exists in DB
    const studentUser = await User.findById(student._id);
    expect(studentUser).not.toBeNull();
  });
});
