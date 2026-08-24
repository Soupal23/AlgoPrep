import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { TeacherApplication } from '../src/models/TeacherApplication.js';
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
  await TeacherApplication.deleteMany({});
});

describe('Phase 6 — Teacher Recruitment Pipeline', () => {
  it('should allow public teacher application submission with valid resume file', async () => {
    const res = await request(app)
      .post('/api/teacher-applications/apply')
      .field('name', 'Jane Candidate')
      .field('email', 'jane@example.com')
      .attach('file', Buffer.from('Resume content sample'), 'resume.pdf');

    expect(res.status).toBe(201);
    expect(res.body.application.name).toBe('Jane Candidate');
    expect(res.body.application.email).toBe('jane@example.com');
    expect(res.body.application.status).toBe('pending');
  });

  it('should reject non-document file uploads for teacher application', async () => {
    const res = await request(app)
      .post('/api/teacher-applications/apply')
      .field('name', 'Jane Candidate')
      .field('email', 'jane@example.com')
      .attach('file', Buffer.from('fake image'), 'avatar.png');

    expect(res.status).toBe(400);
  });

  it('should prevent unapproved email from registering as a teacher', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Unapproved Teacher',
        email: 'unapproved@example.com',
        password: 'password123',
        role: 'teacher'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('not whitelisted');
  });

  it('should allow admin to approve application and allow whitelisted email to register as teacher', async () => {
    // 1. Submit application
    const appRes = await request(app)
      .post('/api/teacher-applications/apply')
      .field('name', 'Prof John')
      .field('email', 'john@example.com')
      .attach('file', Buffer.from('CV text'), 'cv.txt');

    const appId = appRes.body.application._id;

    // 2. Admin approves application
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@algoprep.com',
      password: 'hashedpassword',
      role: 'admin',
      isActive: true
    });

    const adminToken = generateAccessToken({
      userId: adminUser._id.toString(),
      email: adminUser.email,
      role: 'admin',
      isActive: true
    });

    const approveRes = await request(app)
      .patch(`/api/admin/teacher-applications/${appId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.application.status).toBe('approved');

    // 3. Register as teacher with approved email
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Prof John',
        email: 'john@example.com',
        password: 'password123',
        role: 'teacher'
      });

    expect(signupRes.status).toBe(201);
    expect(signupRes.body.user.role).toBe('teacher');
  });
});
