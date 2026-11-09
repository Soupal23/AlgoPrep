import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
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
});

describe('Phase 7 — Profiles', () => {
  it('should view and update user profile', async () => {
    const user = await User.create({
      name: 'Initial Name',
      email: 'user@test.com',
      password: 'hashedpassword',
      role: 'student',
      isActive: true
    });

    const token = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      isActive: true
    });

    // 1. Get profile
    const getRes = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.user.name).toBe('Initial Name');

    // 2. Update profile
    const updateRes = await request(app)
      .patch('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated Name',
        bio: 'Passionate about algorithms',
        subjectFocus: 'DSA & Systems'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.user.name).toBe('Updated Name');
    expect(updateRes.body.user.bio).toBe('Passionate about algorithms');
    expect(updateRes.body.user.subjectFocus).toBe('DSA & Systems');
  });

  it('should validate avatar uploads', async () => {
    const user = await User.create({
      name: 'Avatar User',
      email: 'avatar@test.com',
      password: 'hashedpassword',
      role: 'student',
      isActive: true
    });

    const token = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      isActive: true
    });

    // Valid PNG upload
    const pngBuffer = Buffer.from('fake png binary data');
    const validRes = await request(app)
      .post('/api/users/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', pngBuffer, 'profile.png');

    expect(validRes.status).toBe(200);
    expect(validRes.body.avatarUrl).toContain('uploads/avatars/');

    // Invalid file type upload (PDF)
    const invalidRes = await request(app)
      .post('/api/users/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('fake pdf data'), 'doc.pdf');

    expect(invalidRes.status).toBe(400);
  });
});
