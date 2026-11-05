import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Workspace } from '../src/models/Workspace.js';
import { Material } from '../src/models/Material.js';
import { Chunk } from '../src/models/Chunk.js';
import { Roadmap } from '../src/models/Roadmap.js';
import { Day } from '../src/models/Day.js';
import { Job } from '../src/models/Job.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { topologicalSortTopics, scheduleDays } from '../src/utils/roadmapScheduler.js';
import { generateRoadmap, updateDayStatus } from '../src/services/roadmapService.js';

let mongoServer;
let student, token;

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
  await Workspace.deleteMany({});
  await Material.deleteMany({});
  await Chunk.deleteMany({});
  await Roadmap.deleteMany({});
  await Day.deleteMany({});
  await Job.deleteMany({});

  student = await User.create({
    name: 'Roadmap Explorer',
    email: 'roadmap@algoprep.test',
    password: 'password123',
    role: 'student'
  });
  token = generateAccessToken({ userId: student._id.toString(), email: student.email, role: student.role });
});

describe('Phase 4 — Roadmap Scheduling Algorithms', () => {
  it('should correctly topologically sort topics by prerequisites', () => {
    const rawTopics = [
      { key: 'trees', title: 'Binary Trees', prerequisites: ['linked-lists'] },
      { key: 'linked-lists', title: 'Linked Lists', prerequisites: ['arrays'] },
      { key: 'arrays', title: 'Arrays & Memory', prerequisites: [] },
      { key: 'graphs', title: 'Graph Traversal', prerequisites: ['trees'] }
    ];

    const sorted = topologicalSortTopics(rawTopics);
    const keys = sorted.map(t => t.key);

    expect(keys.indexOf('arrays')).toBeLessThan(keys.indexOf('linked-lists'));
    expect(keys.indexOf('linked-lists')).toBeLessThan(keys.indexOf('trees'));
    expect(keys.indexOf('trees')).toBeLessThan(keys.indexOf('graphs'));
  });

  it('should detect and safely break circular dependencies without losing topics', () => {
    const circularTopics = [
      { key: 'topic-a', title: 'A', prerequisites: ['topic-c'] },
      { key: 'topic-b', title: 'B', prerequisites: ['topic-a'] },
      { key: 'topic-c', title: 'C', prerequisites: ['topic-b'] }
    ];

    const sorted = topologicalSortTopics(circularTopics);
    expect(sorted.length).toBe(3);
    const keys = sorted.map(t => t.key);
    expect(keys).toContain('topic-a');
    expect(keys).toContain('topic-b');
    expect(keys).toContain('topic-c');
  });

  it('should partition topics into learn, revision, and mock days', () => {
    const topics = [
      { key: 't1', title: 'Topic 1', estMinutes: 60 },
      { key: 't2', title: 'Topic 2', estMinutes: 60 },
      { key: 't3', title: 'Topic 3', estMinutes: 60 }
    ];

    const days = scheduleDays({ topics, totalDays: 7, hoursPerDay: 2 });
    expect(days.length).toBe(7);

    // Days 1-5: learn
    expect(days[0].type).toBe('learn');
    expect(days[0].status).toBe('available');
    expect(days[1].status).toBe('locked');

    // Day 6: revision
    expect(days[5].type).toBe('revision');
    expect(days[5].status).toBe('locked');

    // Day 7: mock
    expect(days[6].type).toBe('mock');
    expect(days[6].status).toBe('locked');
  });
});

describe('Phase 4 — Roadmap Service & API Lifecycle', () => {
  it('should generate a grounded roadmap and day timeline from workspace materials', async () => {
    const ws = await Workspace.create({
      ownerId: student._id,
      title: 'Database Systems Architecture',
      subject: 'Computer Science'
    });

    const mat = await Material.create({
      workspaceId: ws._id,
      ownerId: student._id,
      fileName: 'dbms_syllabus.txt',
      mimeType: 'text/plain',
      kind: 'syllabus',
      status: 'ready'
    });

    await Chunk.create({
      workspaceId: ws._id,
      materialId: mat._id,
      ownerId: student._id,
      text: 'Relational model, SQL normalization (1NF, 2NF, 3NF, BCNF), and ACID transaction concurrency control.',
      tokenCount: 20,
      hash: 'h-dbms-1'
    });

    // 1. Generate roadmap
    const result = await generateRoadmap({
      workspaceId: ws._id,
      userId: student._id,
      settings: { days: 5, hoursPerDay: 2, level: 'intermediate' }
    });

    expect(result.success).toBe(true);
    expect(result.roadmap).toBeDefined();
    expect(result.days.length).toBe(5);

    // 2. Fetch roadmap via API
    const getRes = await request(app)
      .get(`/api/workspaces/${ws._id}/roadmap`)
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.roadmap.days.length).toBe(5);
    expect(getRes.body.roadmap.days[0].status).toBe('available');
    expect(getRes.body.roadmap.days[1].status).toBe('locked');
  }, 20000);

  it('should unlock the next day when a day is marked completed', async () => {
    const ws = await Workspace.create({
      ownerId: student._id,
      title: 'Operating Systems',
      subject: 'CS'
    });

    const roadmap = await Roadmap.create({
      workspaceId: ws._id,
      ownerId: student._id,
      status: 'ready'
    });

    const day1 = await Day.create({
      roadmapId: roadmap._id,
      workspaceId: ws._id,
      ownerId: student._id,
      dayNumber: 1,
      title: 'Day 1: Processes',
      status: 'available'
    });

    const day2 = await Day.create({
      roadmapId: roadmap._id,
      workspaceId: ws._id,
      ownerId: student._id,
      dayNumber: 2,
      title: 'Day 2: Threads',
      status: 'locked'
    });

    // Mark Day 1 complete via API
    const patchRes = await request(app)
      .patch(`/api/days/${day1._id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.day.status).toBe('completed');

    // Verify Day 2 was unlocked automatically
    const updatedDay2 = await Day.findById(day2._id);
    expect(updatedDay2.status).toBe('available');
  });

  it('should enforce the maximum limit of 3 roadmap regenerations', async () => {
    const ws = await Workspace.create({
      ownerId: student._id,
      title: 'Limits Test',
      subject: 'CS'
    });

    const roadmap = await Roadmap.create({
      workspaceId: ws._id,
      ownerId: student._id,
      regenerateCount: 3,
      status: 'ready'
    });

    const regenRes = await request(app)
      .post(`/api/roadmaps/${roadmap._id}/regenerate`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(regenRes.status).toBe(400);
    expect(regenRes.body.message).toMatch(/Maximum roadmap regenerations/);
  });
});
