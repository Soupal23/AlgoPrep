import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Job } from '../src/models/Job.js';
import { createJob, updateJobProgress, completeJob, failJob, jobEvents } from '../src/services/jobService.js';
import { generateAccessToken } from '../src/utils/jwt.js';

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
  await Job.deleteMany({});
});

describe('Phase 2 — Background Jobs & Progress Tracking', () => {
  it('should create, update progress, and complete a job model', async () => {
    const user = await User.create({
      name: 'Job Tester',
      email: 'jobuser@test.com',
      password: 'password123',
      role: 'student'
    });

    // 1. Create Job
    const job = await createJob({
      userId: user._id,
      type: 'ingest',
      stage: 'Uploading document'
    });

    expect(job).toBeDefined();
    expect(job.status).toBe('queued');
    expect(job.progress).toBe(0);

    // 2. Update Progress
    const updated = await updateJobProgress(job._id, {
      progress: 50,
      stage: 'Extracting pages'
    });

    expect(updated.status).toBe('running');
    expect(updated.progress).toBe(50);
    expect(updated.stage).toBe('Extracting pages');

    // 3. Complete Job
    const completed = await completeJob(job._id, { chunksCount: 15 });
    expect(completed.status).toBe('completed');
    expect(completed.progress).toBe(100);
    expect(completed.result.chunksCount).toBe(15);
  });

  it('should emit progress events on jobEvents emitter', async () => {
    const user = await User.create({
      name: 'Event Tester',
      email: 'eventuser@test.com',
      password: 'password123',
      role: 'student'
    });

    const job = await createJob({
      userId: user._id,
      type: 'roadmap',
      stage: 'Starting'
    });

    const receivedEvents = [];
    const eventName = `job:${job._id}`;

    jobEvents.on(eventName, (data) => {
      receivedEvents.push(data);
    });

    await updateJobProgress(job._id, { progress: 30, stage: 'Clustering topics' });
    await completeJob(job._id, { success: true });

    expect(receivedEvents.length).toBe(2);
    expect(receivedEvents[0].progress).toBe(30);
    expect(receivedEvents[1].status).toBe('completed');
  });

  it('should fetch job status via GET /api/jobs/:id', async () => {
    const user = await User.create({
      name: 'API Tester',
      email: 'apiuser@test.com',
      password: 'password123',
      role: 'student'
    });

    const token = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      isActive: true
    });

    const job = await createJob({
      userId: user._id,
      type: 'day_content',
      stage: 'Writing notes'
    });

    const res = await request(app)
      .get(`/api/jobs/${job._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.job).toBeDefined();
    expect(res.body.job.type).toBe('day_content');
    expect(res.body.job.stage).toBe('Writing notes');
  });
});
