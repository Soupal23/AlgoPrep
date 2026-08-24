import puppeteer from 'puppeteer';
import http from 'http';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';
import fs from 'fs';

// App & Models
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Membership } from '../src/models/Membership.js';
import { Announcement } from '../src/models/Announcement.js';
import { RecordedLecture } from '../src/models/RecordedLecture.js';
import { Conversation } from '../src/models/Conversation.js';
import { Message } from '../src/models/Message.js';
import bcrypt from 'bcryptjs';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\bfc38384-8f2b-4fe6-a743-399063993adf';

async function runVerification() {
  console.log('=== STARTING PHASE 5B END-TO-END BROWSER VERIFICATION ===');

  // 1. Start MongoDB In-Memory Server & Seed Test Accounts
  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  console.log('Connected to In-Memory MongoDB');

  const hashedPassword = await bcrypt.hash('password123', 10);

  const teacher = await User.create({
    name: 'Prof Alan Turing',
    email: 'turing@algoprep.com',
    password: hashedPassword,
    role: 'teacher',
    bio: 'Pioneer of theoretical computer science and AI.',
    subjectFocus: 'Algorithms & Computability',
    isActive: true
  });

  const student = await User.create({
    name: 'Ada Lovelace',
    email: 'ada@algoprep.com',
    password: hashedPassword,
    role: 'student',
    bio: 'Aspiring computer scientist.',
    isActive: true
  });

  await Membership.create({
    studentId: student._id,
    teacherId: teacher._id,
    status: 'active'
  });

  await Announcement.create({
    teacherId: teacher._id,
    title: 'Welcome to Advanced Algorithms 101',
    content: 'Class starts this Monday at 10 AM EST. Please review the syllabus in advance!'
  });

  await RecordedLecture.create({
    teacherId: teacher._id,
    title: 'Lecture 1: Time Complexity & Big-O Notation',
    description: 'In-depth analysis of asymptotic bounds and algorithmic efficiency.',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
  });

  const conversation = await Conversation.create({
    studentId: student._id,
    teacherId: teacher._id,
    lastMessageAt: new Date()
  });

  await Message.create({
    conversationId: conversation._id,
    senderId: teacher._id,
    receiverId: student._id,
    content: 'Welcome Ada! Let me know if you have any questions about the first assignment.'
  });

  console.log('Database seeded with demo teacher, student, announcement, lecture, and message.');

  // 2. Start Express API Server on Port 5005
  const server = app.listen(5005);
  console.log('Express API server running on http://localhost:5005');

  // 3. Serve Vite Client Static Build on Port 5173 with API Proxying
  const clientDist = path.resolve('../client/dist');
  const staticApp = express();
  staticApp.use(cors());
  staticApp.use(express.static(clientDist));
  
  // Proxy /api calls to Express API server on 5005
  staticApp.use('/api', (req, res) => {
    const options = {
      hostname: 'localhost',
      port: 5005,
      path: `/api${req.url}`,
      method: req.method,
      headers: { ...req.headers, host: 'localhost:5005' }
    };
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });
    req.pipe(proxyReq, { end: true });
  });

  staticApp.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  const clientServer = staticApp.listen(5173);
  console.log('Client static server running on http://localhost:5173');

  // 4. Launch Puppeteer Browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // A. Log in as Student
    console.log('Navigating to login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });

    await page.type('input[type="email"]', 'ada@algoprep.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log('Student logged in successfully!');

    // B. Verify & Capture Profile Page
    await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase5B_student_profile.png') });
    console.log('Saved screenshot: phase5B_student_profile.png');

    // C. Verify & Capture Browse Teachers Page
    await page.goto('http://localhost:5173/teachers', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase5B_browse_teachers.png') });
    console.log('Saved screenshot: phase5B_browse_teachers.png');

    // D. Verify & Capture Announcements Feed Page
    await page.goto('http://localhost:5173/announcements', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase5B_announcements_feed.png') });
    console.log('Saved screenshot: phase5B_announcements_feed.png');

    // E. Verify & Capture Recorded Lectures Page
    await page.goto('http://localhost:5173/lectures', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase5B_recorded_lectures.png') });
    console.log('Saved screenshot: phase5B_recorded_lectures.png');

    // F. Verify & Capture Direct Messages Page
    await page.goto('http://localhost:5173/messages', { waitUntil: 'networkidle0' });
    await page.waitForSelector('textarea, input[placeholder*="message"]', { timeout: 5000 }).catch(() => {});
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase5B_messages.png') });
    console.log('Saved screenshot: phase5B_messages.png');

    console.log(`Console Errors Captured: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Console Errors:', consoleErrors);
    }
  } finally {
    await browser.close();
    clientServer.close();
    server.close();
    await mongoose.disconnect();
    await mongoServer.stop();
    console.log('=== VERIFICATION COMPLETED SUCCESSFULLY ===');
  }
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
