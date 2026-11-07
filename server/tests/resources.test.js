import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Workspace } from '../src/models/Workspace.js';
import { Roadmap } from '../src/models/Roadmap.js';
import { Day } from '../src/models/Day.js';
import { Resource } from '../src/models/Resource.js';
import { ResourceQueryCache } from '../src/models/ResourceQueryCache.js';
import { DayResource } from '../src/models/DayResource.js';
import { Job } from '../src/models/Job.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { llmGateway } from '../src/ai/llmGateway.js';
import { searchWikipedia } from '../src/resources/adapters/wikipedia.js';
import { searchYouTube, parseIsoDuration } from '../src/resources/adapters/youtube.js';
import { searchWeb } from '../src/resources/adapters/webSearch.js';
import { searchArxiv } from '../src/resources/adapters/arxiv.js';
import {
  getDayResources,
  getOrCurateDayResources,
  saveResourceFeedback
} from '../src/services/resourceService.js';

let mongoServer;
let student, token;
let otherStudent, otherToken;
let workspace, roadmap, day1;

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
  await Roadmap.deleteMany({});
  await Day.deleteMany({});
  await Resource.deleteMany({});
  await ResourceQueryCache.deleteMany({});
  await DayResource.deleteMany({});
  await Job.deleteMany({});

  // Mock LLM Reranking
  vi.spyOn(llmGateway, 'generateObject').mockImplementation(async () => {
    return {
      data: {
        rankings: [
          {
            externalId: 'yt-mock-1',
            score: 95,
            whyRecommended: 'Clear visual demonstration of balance invariants.'
          },
          {
            externalId: 'wiki-avl-tree',
            score: 90,
            whyRecommended: 'Rigorous formal proofs and asymptotic time analysis.'
          }
        ]
      }
    };
  });

  // Seed primary student
  student = await User.create({
    name: 'Alice Student',
    email: 'alice@example.com',
    password: 'hashedpassword123',
    role: 'student'
  });
  token = generateAccessToken({
    userId: student._id.toString(),
    email: student.email,
    role: student.role
  });

  // Seed secondary student
  otherStudent = await User.create({
    name: 'Bob Student',
    email: 'bob@example.com',
    password: 'hashedpassword123',
    role: 'student'
  });
  otherToken = generateAccessToken({
    userId: otherStudent._id.toString(),
    email: otherStudent.email,
    role: otherStudent.role
  });

  // Seed workspace
  workspace = await Workspace.create({
    ownerId: student._id,
    title: 'Data Structures & Algorithms',
    subject: 'Computer Science',
    description: 'Balanced search trees and graphs',
    examDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  });

  // Seed roadmap
  roadmap = await Roadmap.create({
    workspaceId: workspace._id,
    ownerId: student._id,
    title: 'DSA 14-Day Roadmap',
    settings: {
      examDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      dailyHours: 2,
      level: 'intermediate'
    },
    topics: [
      {
        key: 'avl-trees',
        title: 'AVL Trees and Tree Rotations',
        description: 'Self-balancing binary search trees with height-balance invariant.',
        difficulty: 'medium',
        estMinutes: 60,
        prerequisites: ['binary-search-trees']
      },
      {
        key: 'red-black-trees',
        title: 'Red-Black Tree Properties',
        description: 'Coloring invariants, recoloring, and black-height balance.',
        difficulty: 'hard',
        estMinutes: 75,
        prerequisites: ['avl-trees']
      }
    ],
    status: 'ready'
  });

  // Seed Day 1
  day1 = await Day.create({
    roadmapId: roadmap._id,
    workspaceId: workspace._id,
    ownerId: student._id,
    dayNumber: 1,
    title: 'Self-Balancing Binary Search Trees',
    objectives: ['Master single and double tree rotations', 'Verify AVL height balance'],
    topicKeys: ['avl-trees'],
    estMinutes: 60,
    type: 'learn',
    status: 'available',
    content: {
      notesStatus: 'ready',
      resourcesStatus: 'pending',
      testStatus: 'pending'
    }
  });
});

describe('Phase 6 — Multi-Source Adapters Unit Tests', () => {
  it('parses ISO 8601 duration correctly', () => {
    expect(parseIsoDuration('PT14M22S')).toBe(14 * 60 + 22);
    expect(parseIsoDuration('PT1H2M3S')).toBe(3600 + 120 + 3);
    expect(parseIsoDuration('PT45M')).toBe(45 * 60);
    expect(parseIsoDuration(null)).toBe(600);
  });

  it('Wikipedia adapter returns valid encyclopedic article or fallback', async () => {
    const results = await searchWikipedia('Binary search tree');
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].source).toBe('wikipedia');
    expect(results[0].url).toContain('wikipedia.org');
    expect(results[0].qualityScore).toBeGreaterThanOrEqual(75);
  });

  it('YouTube adapter returns curated educational video structure', async () => {
    const results = await searchYouTube('AVL Trees', 2);
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].source).toBe('youtube');
    expect(results[0].url).toContain('youtube.com');
  });

  it('Web search adapter returns technical documentation and references', async () => {
    const results = await searchWeb('Dijkstra Algorithm', 2);
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].source).toBe('web');
  });

  it('arXiv adapter returns academic research paper format', async () => {
    const results = await searchArxiv('Self balancing trees', 1);
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].source).toBe('arxiv');
    expect(results[0].qualityScore).toBeGreaterThanOrEqual(80);
  });
});

describe('Phase 6 — Resource Curation Service & 30-Day Caching', () => {
  it('curates resources across adapters and populates DayResource and 30-day cache', async () => {
    const resources = await getOrCurateDayResources({
      dayId: day1._id.toString(),
      userId: student._id.toString(),
      force: false
    });

    expect(resources).toBeDefined();
    expect(resources.length).toBeGreaterThan(0);

    const first = resources[0];
    expect(first.topicKey).toBe('avl-trees');
    expect(first.rank).toBe(1);
    expect(first.finalScore).toBeGreaterThan(0);
    expect(first.whyRecommended).toBeTruthy();

    // Verify day status updated
    const updatedDay = await Day.findById(day1._id);
    expect(updatedDay.content.resourcesStatus).toBe('ready');

    // Verify 30-day cache was created
    const cacheKey = 'topic:avl-trees:intermediate';
    const cached = await ResourceQueryCache.findOne({ key: cacheKey });
    expect(cached).toBeDefined();
    expect(cached.resourceIds.length).toBeGreaterThan(0);
  });

  it('reuses 30-day cache on subsequent curation without re-querying external sources', async () => {
    // 1. First curation
    await getOrCurateDayResources({
      dayId: day1._id.toString(),
      userId: student._id.toString(),
      force: false
    });

    const cacheKey = 'topic:avl-trees:intermediate';
    const cacheDoc = await ResourceQueryCache.findOne({ key: cacheKey });
    expect(cacheDoc).toBeDefined();

    // Clear DayResource entries to simulate another day with the same topic
    await DayResource.deleteMany({ dayId: day1._id });

    // 2. Second curation should hit cache
    const secondPass = await getOrCurateDayResources({
      dayId: day1._id.toString(),
      userId: student._id.toString(),
      force: false
    });

    expect(secondPass.length).toBeGreaterThan(0);
    // Cached IDs match
    const returnedIds = secondPass.map(r => (r.resourceId?._id || r.resourceId).toString());
    const cachedIds = cacheDoc.resourceIds.map(id => id.toString());
    for (const id of returnedIds) {
      expect(cachedIds).toContain(id);
    }
  });

  it('saves helpful and watched feedback on DayResource', async () => {
    const [created] = await getOrCurateDayResources({
      dayId: day1._id.toString(),
      userId: student._id.toString(),
      force: false
    });

    const updated = await saveResourceFeedback({
      dayResourceId: created._id.toString(),
      userId: student._id.toString(),
      helpful: true,
      watched: true
    });

    expect(updated.feedback.helpful).toBe(true);
    expect(updated.feedback.watched).toBe(true);
    expect(updated.feedback.updatedAt).toBeInstanceOf(Date);
  });
});

describe('Phase 6 — API Endpoints & Security Checks', () => {
  it('GET /api/days/:dayId/resources?sync=true curates and returns resources for owner', async () => {
    const res = await request(app)
      .get(`/api/days/${day1._id}/resources?sync=true`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.resources.length).toBeGreaterThan(0);
  });

  it('GET /api/days/:dayId/resources returns 403 Forbidden for another student', async () => {
    const res = await request(app)
      .get(`/api/days/${day1._id}/resources`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/days/:dayId/resources/regenerate?sync=true forces fresh curation', async () => {
    const res = await request(app)
      .post(`/api/days/${day1._id}/resources/regenerate?sync=true`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.resources.length).toBeGreaterThan(0);
  });

  it('POST /api/resources/:id/feedback updates student feedback', async () => {
    const [item] = await getOrCurateDayResources({
      dayId: day1._id.toString(),
      userId: student._id.toString(),
      force: false
    });

    const res = await request(app)
      .post(`/api/resources/${item._id}/feedback`)
      .set('Authorization', `Bearer ${token}`)
      .send({ helpful: true, watched: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.dayResource.feedback.helpful).toBe(true);
    expect(res.body.dayResource.feedback.watched).toBe(true);
  });

  it('POST /api/resources/:id/feedback rejects modification from unauthorized student with 403', async () => {
    const [item] = await getOrCurateDayResources({
      dayId: day1._id.toString(),
      userId: student._id.toString(),
      force: false
    });

    const res = await request(app)
      .post(`/api/resources/${item._id}/feedback`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ helpful: false });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('cascades deletion of DayResource when workspace is deleted', async () => {
    await getOrCurateDayResources({
      dayId: day1._id.toString(),
      userId: student._id.toString(),
      force: false
    });

    const beforeCount = await DayResource.countDocuments({ workspaceId: workspace._id });
    expect(beforeCount).toBeGreaterThan(0);

    const res = await request(app)
      .delete(`/api/workspaces/${workspace._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const afterCount = await DayResource.countDocuments({ workspaceId: workspace._id });
    expect(afterCount).toBe(0);
  });
});
