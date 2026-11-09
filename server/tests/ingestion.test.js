import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Workspace } from '../src/models/Workspace.js';
import { Material } from '../src/models/Material.js';
import { Chunk } from '../src/models/Chunk.js';
import { Job } from '../src/models/Job.js';
import { ingestMaterial } from '../src/services/ingestionService.js';
import { createJob } from '../src/services/jobService.js';
import { retriever } from '../src/ai/retriever.js';
import { generateAccessToken } from '../src/utils/jwt.js';

let mongoServer;
let userA, tokenA;
let userB, tokenB;

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
  await Job.deleteMany({});

  userA = await User.create({
    name: 'Alice Learner',
    email: 'alice@example.com',
    password: 'password123',
    role: 'student'
  });
  tokenA = generateAccessToken({ userId: userA._id.toString(), email: userA.email, role: userA.role });

  userB = await User.create({
    name: 'Bob Learner',
    email: 'bob@example.com',
    password: 'password123',
    role: 'student'
  });
  tokenB = generateAccessToken({ userId: userB._id.toString(), email: userB.email, role: userB.role });
});

describe('Phase 3 — Workspace CRUD & Material Ingestion', () => {
  it('should create, read, update, and delete a workspace', async () => {
    // 1. Create Workspace
    const createRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'Distributed Systems',
        subject: 'Computer Science',
        description: 'Consensus algorithms, Raft, Paxos and MapReduce'
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.workspace.title).toBe('Distributed Systems');
    const workspaceId = createRes.body.workspace._id;

    // 2. Read Workspaces List
    const listRes = await request(app)
      .get('/api/workspaces')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.workspaces.length).toBe(1);
    expect(listRes.body.workspaces[0].title).toBe('Distributed Systems');
    expect(listRes.body.workspaces[0].materialCount).toBe(0);

    // 3. Update Workspace
    const updateRes = await request(app)
      .put(`/api/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'Advanced Distributed Systems' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.workspace.title).toBe('Advanced Distributed Systems');

    // 4. Delete Workspace
    const deleteRes = await request(app)
      .delete(`/api/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(deleteRes.status).toBe(200);

    const checkWorkspace = await Workspace.findById(workspaceId);
    expect(checkWorkspace).toBeNull();
  });

  it('should enforce workspace ownership boundaries', async () => {
    const ws = await Workspace.create({
      ownerId: userA._id,
      title: 'Secret Workspace',
      subject: 'Math'
    });

    // User B tries to view User A's workspace
    const getRes = await request(app)
      .get(`/api/workspaces/${ws._id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(getRes.status).toBe(403);

    // User B tries to delete User A's workspace
    const delRes = await request(app)
      .delete(`/api/workspaces/${ws._id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(delRes.status).toBe(403);
  });

  it('should process text material through ingestion service and produce chunks', async () => {
    const ws = await Workspace.create({
      ownerId: userA._id,
      title: 'Operating Systems',
      subject: 'CS'
    });

    const material = await Material.create({
      workspaceId: ws._id,
      ownerId: userA._id,
      kind: 'notes',
      fileName: 'virtual_memory.txt',
      mimeType: 'text/plain',
      status: 'pending'
    });

    const job = await createJob({
      userId: userA._id,
      type: 'ingest',
      refId: material._id,
      stage: 'Queued'
    });
    material.jobId = job._id;
    await material.save();

    const sampleContent = `
# Virtual Memory and Paging

Virtual memory is a memory management technique that provides an idealized abstraction of the storage resources that are actually available on a given machine.

## Page Tables and TLB
A page table is the data structure used by a virtual memory system in a computer operating system to store the mapping between virtual addresses and physical addresses. The Translation Lookaside Buffer (TLB) is an associative memory hardware cache used to reduce the time taken to access a user memory location.

## Page Replacement Algorithms
Common algorithms include First-In First-Out (FIFO), Least Recently Used (LRU), and Optimal Page Replacement.
`;

    const result = await ingestMaterial({
      materialId: material._id,
      workspaceId: ws._id,
      userId: userA._id,
      buffer: Buffer.from(sampleContent, 'utf-8'),
      mimeType: 'text/plain',
      originalName: 'virtual_memory.txt',
      jobId: job._id
    });

    expect(result.success).toBe(true);
    expect(result.chunkCount).toBeGreaterThan(0);

    // Verify Material updated
    const updatedMaterial = await Material.findById(material._id);
    expect(updatedMaterial.status).toBe('ready');
    expect(updatedMaterial.chunkCount).toBe(result.chunkCount);
    expect(updatedMaterial.charCount).toBeGreaterThan(100);

    // Verify Chunks stored in DB
    const chunks = await Chunk.find({ materialId: material._id });
    expect(chunks.length).toBe(result.chunkCount);
    expect(chunks[0].text).toContain('Virtual memory');

    // Verify Job completed
    const updatedJob = await Job.findById(job._id);
    expect(updatedJob.status).toBe('completed');
    expect(updatedJob.progress).toBe(100);
  });

  it('should retrieve relevant passages via semantic/keyword fallback search', async () => {
    const ws = await Workspace.create({
      ownerId: userA._id,
      title: 'Database Internals',
      subject: 'CS'
    });

    const material = await Material.create({
      workspaceId: ws._id,
      ownerId: userA._id,
      fileName: 'btree_index.txt',
      mimeType: 'text/plain',
      status: 'ready'
    });

    await Chunk.create([
      {
        workspaceId: ws._id,
        materialId: material._id,
        ownerId: userA._id,
        text: 'B-Trees are self-balancing search trees commonly used in relational databases for secondary indexing and range queries.',
        tokenCount: 25,
        location: { page: 1 },
        hash: 'h1'
      },
      {
        workspaceId: ws._id,
        materialId: material._id,
        ownerId: userA._id,
        text: 'Two-Phase Locking (2PL) is a concurrency control protocol that guarantees serializability in transaction management.',
        tokenCount: 24,
        location: { page: 2 },
        hash: 'h2'
      }
    ]);

    // Test search via HTTP endpoint
    const searchRes = await request(app)
      .post(`/api/workspaces/${ws._id}/search`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ query: 'B-Trees indexing' });

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.count).toBeGreaterThan(0);
    expect(searchRes.body.results[0].text).toContain('B-Trees');
  });

  it('should upload files and initiate ingestion jobs via multipart endpoint', async () => {
    const ws = await Workspace.create({
      ownerId: userA._id,
      title: 'Compiler Design',
      subject: 'CS'
    });

    const fileContent = 'Lexical analysis is the first phase of a compiler converting source code into tokens.';

    const uploadRes = await request(app)
      .post(`/api/workspaces/${ws._id}/materials`)
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('files', Buffer.from(fileContent), 'lexer_notes.txt');

    expect(uploadRes.status).toBe(202);
    expect(uploadRes.body.materials.length).toBe(1);
    expect(uploadRes.body.jobs.length).toBe(1);

    const materialId = uploadRes.body.materials[0]._id;
    const materialInDb = await Material.findById(materialId);
    expect(materialInDb).toBeDefined();
    expect(materialInDb.fileName).toBe('lexer_notes.txt');
  });
});
