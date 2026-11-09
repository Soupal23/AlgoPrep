import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Workspace } from '../src/models/Workspace.js';
import { Day } from '../src/models/Day.js';
import { Roadmap } from '../src/models/Roadmap.js';
import { Attempt } from '../src/models/Attempt.js';
import { Test } from '../src/models/Test.js';
import { ChatSession } from '../src/models/ChatSession.js';
import { ChatMessage } from '../src/models/ChatMessage.js';
import { ConceptMastery } from '../src/models/ConceptMastery.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { llmGateway } from '../src/ai/llmGateway.js';
import { retriever } from '../src/ai/retriever.js';

let mongoServer;
let student, token;
let otherStudent, otherToken;
let workspace, day1;

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
  await Day.deleteMany({});
  await Roadmap.deleteMany({});
  await Attempt.deleteMany({});
  await Test.deleteMany({});
  await ChatSession.deleteMany({});
  await ChatMessage.deleteMany({});
  await ConceptMastery.deleteMany({});

  // Seed primary student
  student = await User.create({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    password: 'password123',
    role: 'student'
  });
  token = generateAccessToken({ userId: student._id.toString(), role: 'student' });

  // Seed second student for auth guard testing
  otherStudent = await User.create({
    name: 'Charles Babbage',
    email: 'charles@example.com',
    password: 'password123',
    role: 'student'
  });
  otherToken = generateAccessToken({ userId: otherStudent._id.toString(), role: 'student' });

  // Workspace
  workspace = await Workspace.create({
    title: 'Operating Systems & Concurrency',
    subject: 'Computer Science',
    ownerId: student._id
  });

  const roadmap = await Roadmap.create({
    workspaceId: workspace._id,
    ownerId: student._id,
    topics: [{ key: 'peterson-algorithm', title: 'Peterson Algorithm', estMinutes: 60 }]
  });

  day1 = await Day.create({
    ownerId: student._id,
    workspaceId: workspace._id,
    roadmapId: roadmap._id,
    dayNumber: 1,
    title: 'Day 1: Peterson Algorithm & Mutual Exclusion',
    type: 'learn',
    topicKeys: ['peterson-algorithm'],
    objectives: ['Understand turn and flag invariants', 'Analyze 2-process synchronization'],
    status: 'in_progress',
    estMinutes: 60
  });

  // Mock retriever response
  vi.spyOn(retriever, 'retrieve').mockResolvedValue([
    {
      chunkId: new mongoose.Types.ObjectId(),
      materialId: new mongoose.Types.ObjectId(),
      materialName: 'OS Lecture Notes Week 2',
      pageNumber: 14,
      text: 'Peterson algorithm guarantees mutual exclusion and progress using flag array and turn variable.'
    }
  ]);

  // Mock llmGateway streamText as async generator
  vi.spyOn(llmGateway, 'streamText').mockImplementation(async function* () {
    yield 'Peterson’s algorithm ';
    yield 'achieves mutual exclusion ';
    yield 'using turn and flag variables.';
  });

  // Mock llmGateway generateText for summarization
  vi.spyOn(llmGateway, 'generateText').mockResolvedValue({
    text: 'Student explored Peterson algorithm invariants and discussed turn variables.'
  });
});

describe('Phase 9: AI Tutor Chat Sessions & Message Management', () => {
  it('creates and retrieves chat sessions for a workspace', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspace._id}/chat/sessions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ dayId: day1._id, title: 'Day 1 Peterson Q&A' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.session).toBeTruthy();
    expect(res.body.session.workspaceId).toBe(workspace._id.toString());
    expect(res.body.session.dayId).toBe(day1._id.toString());
    expect(res.body.session.title).toBe('Day 1 Peterson Q&A');

    // List sessions
    const listRes = await request(app)
      .get(`/api/workspaces/${workspace._id}/chat/sessions`)
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.sessions).toHaveLength(1);
    expect(listRes.body.sessions[0]._id).toBe(res.body.session._id);

    // Forbidden for unauthorized student
    const forbiddenRes = await request(app)
      .get(`/api/workspaces/${workspace._id}/chat/sessions`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(forbiddenRes.status).toBe(403);
  });

  it('retrieves and deletes messages within a session with strict authorization', async () => {
    const session = await ChatSession.create({
      workspaceId: workspace._id,
      ownerId: student._id,
      title: 'Concurrency Doubts'
    });

    await ChatMessage.create({
      sessionId: session._id,
      workspaceId: workspace._id,
      ownerId: student._id,
      role: 'user',
      content: 'Why do we need the turn variable?'
    });

    await ChatMessage.create({
      sessionId: session._id,
      workspaceId: workspace._id,
      ownerId: student._id,
      role: 'assistant',
      content: 'The turn variable prevents deadlock by breaking symmetry.'
    });

    // Student retrieves messages
    const getRes = await request(app)
      .get(`/api/chat/sessions/${session._id}/messages`)
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.messages).toHaveLength(2);
    expect(getRes.body.messages[0].role).toBe('user');
    expect(getRes.body.messages[1].role).toBe('assistant');

    // Other student is forbidden
    const forbiddenRes = await request(app)
      .get(`/api/chat/sessions/${session._id}/messages`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(forbiddenRes.status).toBe(403);

    // Delete session
    const delRes = await request(app)
      .delete(`/api/chat/sessions/${session._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(200);

    const remainingMessages = await ChatMessage.find({ sessionId: session._id });
    expect(remainingMessages).toHaveLength(0);
  });
});

describe('Phase 9: Real-Time SSE Streaming & Tutor Socratic Guidance', () => {
  it('streams tutor response via SSE, attaches citations, and persists messages', async () => {
    const session = await ChatSession.create({
      workspaceId: workspace._id,
      ownerId: student._id,
      dayId: day1._id,
      title: 'New Study Chat'
    });

    const res = await request(app)
      .post(`/api/chat/sessions/${session._id}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'How does Peterson algorithm guarantee progress?' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.text).toContain('event: meta');
    expect(res.text).toContain('event: chunk');
    expect(res.text).toContain('event: done');
    expect(res.text).toContain('Peterson’s algorithm');

    // Verify messages saved in DB
    const savedMessages = await ChatMessage.find({ sessionId: session._id }).sort({ createdAt: 1 });
    expect(savedMessages).toHaveLength(2);
    expect(savedMessages[0].role).toBe('user');
    expect(savedMessages[0].content).toBe('How does Peterson algorithm guarantee progress?');

    expect(savedMessages[1].role).toBe('assistant');
    expect(savedMessages[1].content).toContain('Peterson’s algorithm achieves mutual exclusion');
    expect(savedMessages[1].citations.length).toBeGreaterThan(0);
    expect(savedMessages[1].citations[0].materialName).toBe('OS Lecture Notes Week 2');

    // Title should be updated from 'New Study Chat'
    const updatedSession = await ChatSession.findById(session._id);
    expect(updatedSession.messageCount).toBe(2);
    expect(updatedSession.title).not.toBe('New Study Chat');
  });

  it('enforces anti-cheating guardrail when a diagnostic test is currently in-progress', async () => {
    const test = await Test.create({
      workspaceId: workspace._id,
      dayId: day1._id,
      title: 'OS Quiz',
      description: 'CBT Quiz',
      topic: 'Peterson',
      totalQuestions: 1,
      timeLimitMinutes: 10,
      createdBy: student._id
    });

    // Create an active IN-PROGRESS test attempt
    await Attempt.create({
      testId: test._id,
      userId: student._id,
      workspaceId: workspace._id,
      dayId: day1._id,
      answers: new Map(),
      status: 'in-progress',
      startedAt: new Date()
    });

    const session = await ChatSession.create({
      workspaceId: workspace._id,
      ownerId: student._id,
      dayId: day1._id
    });

    const res = await request(app)
      .post(`/api/chat/sessions/${session._id}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'What is the answer to question 1?' });

    expect(res.status).toBe(200);
    // Should stream anti-cheating refusal
    expect(res.text).toContain('active diagnostic examination in progress');
    expect(res.text).toContain('cannot answer questions');

    const assistantMsg = await ChatMessage.findOne({ sessionId: session._id, role: 'assistant' });
    expect(assistantMsg.content).toContain('active diagnostic examination in progress');
  });

  it('cascades deletion of ChatSession and ChatMessage when workspace is deleted', async () => {
    const session = await ChatSession.create({
      workspaceId: workspace._id,
      ownerId: student._id,
      title: 'To be deleted'
    });

    await ChatMessage.create({
      sessionId: session._id,
      workspaceId: workspace._id,
      ownerId: student._id,
      role: 'user',
      content: 'Hello'
    });

    const deleteRes = await request(app)
      .delete(`/api/workspaces/${workspace._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);

    const sessions = await ChatSession.find({ workspaceId: workspace._id });
    expect(sessions).toHaveLength(0);

    const messages = await ChatMessage.find({ workspaceId: workspace._id });
    expect(messages).toHaveLength(0);
  });
});
