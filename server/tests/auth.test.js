import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Auth Endpoints & JWT Middleware', () => {
  const testUser = {
    name: 'Auth Test User',
    email: 'authtest@example.com',
    password: 'password123'
  };

  let accessToken;
  let refreshToken;

  it('should register a new user successfully', async () => {
    const res = await supertest(app)
      .post('/api/auth/signup')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('should reject duplicate email registration', async () => {
    const res = await supertest(app)
      .post('/api/auth/signup')
      .send(testUser);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('should login with correct credentials', async () => {
    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('should reject login with wrong password', async () => {
    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('should issue a new access token using refresh token', async () => {
    const res = await supertest(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('should reject access to protected endpoint without Bearer token', async () => {
    const res = await supertest(app)
      .post('/api/tests/dummyid/start');

    expect(res.status).toBe(401);
  });
});
