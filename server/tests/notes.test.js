import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
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
import { Notes } from '../src/models/Notes.js';
import { Job } from '../src/models/Job.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { llmGateway } from '../src/ai/llmGateway.js';
import { generateDayNotes, getNotesByDayId, markNotesAsRead } from '../src/services/notesService.js';

let mongoServer;
let student, token;
let workspace, roadmap, day1, day2;

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
  await Notes.deleteMany({});
  await Job.deleteMany({});

  vi.spyOn(llmGateway, 'generateText').mockImplementation(async ({ prompt }) => {
    return {
      text: `## Grounded Study Notes\nFormal definition and invariants [C1].\n\n### Architectural Deep Dive\nMutual exclusion primitives and lock sequencing.\n\n### Key Takeaways\nCritical synchronization invariants.`,
      usage: { promptTokens: 100, completionTokens: 80 }
    };
  });

  vi.spyOn(llmGateway, 'generateObject').mockImplementation(async () => {
    return {
      data: {
        keyPoints: [
          'Mutexes guarantee mutual exclusion in shared critical sections.',
          'Deadlocks require all 4 Coffman conditions to occur concurrently.'
        ],
        flashcards: [
          {
            front: 'What is a mutex?',
            back: 'A locking primitive that enforces mutual exclusion for thread synchronization.'
          },
          {
            front: 'What are the 4 Coffman conditions?',
            back: 'Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait.'
          }
        ]
      }
    };
  });

  student = await User.create({
    name: 'Ada Lovelace',
    email: 'ada@algoprep.test',
    password: 'password123',
    role: 'student'
  });

  token = generateAccessToken({
    userId: student._id.toString(),
    email: student.email,
    role: student.role
  });

  workspace = await Workspace.create({
    ownerId: student._id,
    title: 'Operating Systems & Concurrency',
    subject: 'Computer Science'
  });

  const material = await Material.create({
    workspaceId: workspace._id,
    ownerId: student._id,
    fileName: 'os_threads_concurrency.pdf',
    mimeType: 'application/pdf',
    kind: 'notes',
    status: 'ready'
  });

  await Chunk.create({
    workspaceId: workspace._id,
    materialId: material._id,
    ownerId: student._id,
    text: 'Mutexes and Semaphores: A mutex provides mutual exclusion for critical sections. A counting semaphore maintains an integer counter to regulate access to multiple instances of a resource.',
    tokenCount: 30,
    location: { page: 14, heading: 'Synchronization Primitives' },
    hash: 'h-os-1'
  });

  await Chunk.create({
    workspaceId: workspace._id,
    materialId: material._id,
    ownerId: student._id,
    text: 'Deadlock Coffman Conditions: Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. Invalidation of any single condition prevents deadlock.',
    tokenCount: 26,
    location: { page: 18, heading: 'Deadlock Prevention' },
    hash: 'h-os-2'
  });

  roadmap = await Roadmap.create({
    workspaceId: workspace._id,
    ownerId: student._id,
    status: 'ready',
    settings: { days: 5, hoursPerDay: 2, level: 'intermediate' },
    topics: [
      {
        key: 'synchronization-mutex',
        title: 'Mutexes & Concurrency Locks',
        description: 'Mutual exclusion mechanisms and synchronization primitives',
        difficulty: 'medium',
        estMinutes: 60
      },
      {
        key: 'deadlock-coffman',
        title: 'Deadlocks & Coffman Conditions',
        description: 'Deadlock characterization, Coffman conditions, and resource allocation graphs',
        difficulty: 'hard',
        estMinutes: 60
      }
    ]
  });

  day1 = await Day.create({
    roadmapId: roadmap._id,
    workspaceId: workspace._id,
    ownerId: student._id,
    dayNumber: 1,
    title: 'Day 1: Thread Concurrency & Locks',
    objectives: [
      'Master mutual exclusion invariants and semaphore wait/signal protocols',
      'Analyze deadlock conditions and avoidance strategies'
    ],
    topicKeys: ['synchronization-mutex', 'deadlock-coffman'],
    estMinutes: 120,
    type: 'learn',
    status: 'available',
    content: {
      notesStatus: 'pending',
      resourcesStatus: 'pending',
      testStatus: 'pending'
    }
  });

  day2 = await Day.create({
    roadmapId: roadmap._id,
    workspaceId: workspace._id,
    ownerId: student._id,
    dayNumber: 2,
    title: 'Day 2: Synthesis & Formula Review',
    objectives: ['Review synchronization invariants and deadlock theorems'],
    topicKeys: [],
    estMinutes: 90,
    type: 'revision',
    status: 'locked',
    content: {
      notesStatus: 'pending',
      resourcesStatus: 'pending',
      testStatus: 'pending'
    }
  });
});

describe('Phase 5 — Grounded Notes Service & RAG Generation', () => {
  it('should generate grounded notes with verified citations from workspace materials', async () => {
    const notes = await generateDayNotes({
      dayId: day1._id,
      userId: student._id,
      force: true
    });

    expect(notes).toBeDefined();
    expect(notes.dayId.toString()).toBe(day1._id.toString());
    expect(notes.workspaceId.toString()).toBe(workspace._id.toString());
    expect(notes.sections.length).toBe(2);

    // Section 1: Mutexes
    const mutexSection = notes.sections.find(s => s.topicKey === 'synchronization-mutex');
    expect(mutexSection).toBeDefined();
    expect(mutexSection.heading).toContain('Mutexes');
    expect(mutexSection.markdown).toBeTruthy();

    // Citations validation
    expect(Array.isArray(mutexSection.citations)).toBe(true);
    if (mutexSection.citations.length > 0) {
      const cite = mutexSection.citations[0];
      expect(cite.citationId).toMatch(/^C\d+$/);
      expect(cite.materialName).toBe('os_threads_concurrency.pdf');
      expect(cite.location.page).toBe(14);
    }

    // High-yield key takeaways & flashcards
    expect(notes.keyPoints.length).toBeGreaterThan(0);
    expect(notes.flashcards.length).toBeGreaterThan(0);
    expect(notes.flashcards[0].front).toBeTruthy();
    expect(notes.flashcards[0].back).toBeTruthy();

    // Verify Day content status updated
    const updatedDay = await Day.findById(day1._id);
    expect(updatedDay.content.notesStatus).toBe('ready');
  }, 40000);

  it('should return cached notes on subsequent calls without regenerating', async () => {
    // 1. Initial generation
    const firstCall = await generateDayNotes({
      dayId: day1._id,
      userId: student._id
    });

    // 2. Subsequent call without force
    const secondCall = await generateDayNotes({
      dayId: day1._id,
      userId: student._id,
      force: false
    });

    expect(firstCall._id.toString()).toBe(secondCall._id.toString());
    expect(firstCall.createdAt.getTime()).toBe(secondCall.createdAt.getTime());
  }, 40000);

  it('should mark notes as read and transition available day to in_progress', async () => {
    await generateDayNotes({
      dayId: day1._id,
      userId: student._id
    });

    expect(day1.status).toBe('available');

    const result = await markNotesAsRead(day1._id, student._id);
    expect(result.notes.readStatus).toBe(true);
    expect(result.day.status).toBe('in_progress');

    const savedNotes = await Notes.findOne({ dayId: day1._id });
    expect(savedNotes.readStatus).toBe(true);
  }, 40000);
});

describe('Phase 5 — Day Notes API Endpoints', () => {
  it('should fetch notes synchronously when ?sync=true is provided', async () => {
    const res = await request(app)
      .get(`/api/days/${day1._id}/notes?sync=true`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('ready');
    expect(res.body.notes).toBeDefined();
    expect(res.body.notes.sections.length).toBe(2);
  }, 40000);

  it('should return 202 Accepted with a tracking jobId when async generation is triggered', async () => {
    const res = await request(app)
      .get(`/api/days/${day2._id}/notes`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('generating');
    expect(res.body.jobId).toBeDefined();

    // Verify job document was created in DB
    const jobDoc = await Job.findById(res.body.jobId);
    expect(jobDoc).toBeDefined();
    expect(jobDoc.type).toBe('day_content');
    expect(jobDoc.refId.toString()).toBe(day2._id.toString());
  });

  it('should mark notes read via POST /api/days/:dayId/notes/read', async () => {
    // Generate notes first
    await generateDayNotes({
      dayId: day1._id,
      userId: student._id
    });

    const res = await request(app)
      .post(`/api/days/${day1._id}/notes/read`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.readStatus).toBe(true);
    expect(res.body.dayStatus).toBe('in_progress');
  }, 40000);

  it('should reject unauthorized access from another user', async () => {
    const intruder = await User.create({
      name: 'Intruder',
      email: 'intruder@algoprep.test',
      password: 'password123',
      role: 'student'
    });
    const intruderToken = generateAccessToken({
      userId: intruder._id.toString(),
      email: intruder.email,
      role: intruder.role
    });

    const res = await request(app)
      .get(`/api/days/${day1._id}/notes`)
      .set('Authorization', `Bearer ${token}`) // Authorized
      .then(async () => {
        return request(app)
          .get(`/api/days/${day1._id}/notes`)
          .set('Authorization', `Bearer ${intruderToken}`); // Intruder
      });

    expect(res.status).toBe(403);
    expect(res.body.message || res.body.error).toMatch(/Forbidden/i);
  });
});
