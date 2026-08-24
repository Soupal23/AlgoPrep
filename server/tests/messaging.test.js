import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Membership } from '../src/models/Membership.js';
import { Conversation } from '../src/models/Conversation.js';
import { Message } from '../src/models/Message.js';
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
  await Conversation.deleteMany({});
  await Message.deleteMany({});
});

describe('Phase 11 — Messaging (Teacher ↔ Student)', () => {
  it('should block non-member student from messaging teacher', async () => {
    const teacher = await User.create({
      name: 'Prof Newton',
      email: 'newton@teacher.com',
      password: 'password123',
      role: 'teacher',
      isActive: true
    });

    const student = await User.create({
      name: 'Student NonMember',
      email: 'nonmember@student.com',
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

    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ recipientId: teacher._id.toString(), content: 'Hello teacher!' });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('must join this teacher');
  });

  it('should support two-way messaging between enrolled student and teacher', async () => {
    const teacher = await User.create({
      name: 'Prof Newton',
      email: 'newton@teacher.com',
      password: 'password123',
      role: 'teacher',
      isActive: true
    });

    const student = await User.create({
      name: 'Student Enrolled',
      email: 'enrolled@student.com',
      password: 'password123',
      role: 'student',
      isActive: true
    });

    await Membership.create({ studentId: student._id, teacherId: teacher._id });

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

    // 1. Student sends message to teacher
    const studentSendRes = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ recipientId: teacher._id.toString(), content: 'Question about assignment 1' });

    expect(studentSendRes.status).toBe(201);
    const conversationId = studentSendRes.body.conversationId;

    // 2. Teacher replies to student
    const teacherSendRes = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ recipientId: student._id.toString(), content: 'Here is the hint for assignment 1' });

    expect(teacherSendRes.status).toBe(201);

    // 3. Teacher fetches conversations list
    const convListRes = await request(app)
      .get('/api/messages/conversations')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(convListRes.status).toBe(200);
    expect(convListRes.body.conversations.length).toBe(1);
    expect(convListRes.body.conversations[0].student.name).toBe('Student Enrolled');

    // 4. Student fetches messages history for the conversation
    const historyRes = await request(app)
      .get(`/api/messages/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.messages.length).toBe(2);
    expect(historyRes.body.messages[0].content).toBe('Question about assignment 1');
    expect(historyRes.body.messages[1].content).toBe('Here is the hint for assignment 1');

    // Verify teacher's incoming message was marked as read
    const updatedTeacherMsg = await Message.findById(historyRes.body.messages[1]._id);
    expect(updatedTeacherMsg.readAt).not.toBeNull();
  });
});
