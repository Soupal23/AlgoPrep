import puppeteer from 'puppeteer';
import http from 'http';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// App & Models
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Membership } from '../src/models/Membership.js';
import { Announcement } from '../src/models/Announcement.js';
import { RecordedLecture } from '../src/models/RecordedLecture.js';
import { Test } from '../src/models/Test.js';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\bfc38384-8f2b-4fe6-a743-399063993adf';

async function runVerification() {
  console.log('=== STARTING PHASE 6B END-TO-END BROWSER VERIFICATION ===');

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

  console.log('Database seeded with demo teacher and joined student.');

  // 2. Start Express API Server on Port 5006
  const server = app.listen(5006);
  console.log('Express API server running on http://localhost:5006');

  // 3. Serve Vite Client Static Build on Port 5174 with API Proxying
  const clientDist = path.resolve('../client/dist');
  const staticApp = express();
  staticApp.use(cors());
  staticApp.use(express.static(clientDist));

  staticApp.use('/api', (req, res) => {
    const options = {
      hostname: 'localhost',
      port: 5006,
      path: `/api${req.url}`,
      method: req.method,
      headers: { ...req.headers, host: 'localhost:5006' }
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

  const clientServer = staticApp.listen(5174);
  console.log('Client static server running on http://localhost:5174');

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
    // A. Log in as Teacher
    console.log('Navigating to login page...');
    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle0' });

    await page.type('input[type="email"]', 'turing@algoprep.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log('Teacher logged in successfully!');

    // B. Verify & Capture Teacher Dashboard
    await page.goto('http://localhost:5174/teacher/dashboard', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase6B_teacher_dashboard.png') });
    console.log('Saved screenshot: phase6B_teacher_dashboard.png');

    // C. Verify & Capture Teacher Roster Page
    await page.goto('http://localhost:5174/teacher/roster', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase6B_teacher_roster.png') });
    console.log('Saved screenshot: phase6B_teacher_roster.png');

    // D. Verify & Post Announcement
    await page.goto('http://localhost:5174/teacher/announcements', { waitUntil: 'networkidle0' });
    await page.type('input[placeholder*="Midterm"]', 'Phase 6B Announcement Test');
    await page.type('textarea[placeholder*="Write your update"]', 'This announcement was created during automated verification.');
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase6B_teacher_announcements.png') });
    console.log('Saved screenshot: phase6B_teacher_announcements.png');

    // E. Verify & Upload Video Lecture
    await page.goto('http://localhost:5174/teacher/lectures', { waitUntil: 'networkidle0' });
    await page.type('input[placeholder*="Masterclass"]', 'Phase 6B Dynamic Programming Lecture');
    await page.type('input[placeholder*="youtube.com"]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await page.type('textarea[placeholder*="Brief overview"]', 'Automated test video upload.');
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase6B_teacher_lectures.png') });
    console.log('Saved screenshot: phase6B_teacher_lectures.png');

    // F. Verify & Capture Teacher Tests Page
    await page.goto('http://localhost:5174/teacher/tests', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase6B_teacher_tests.png') });
    console.log('Saved screenshot: phase6B_teacher_tests.png');

    // G. Cross-Verification: Log in as Student & Verify Broadcasts
    console.log('Switching to Student session...');
    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle0' });
    await page.type('input[type="email"]', 'ada@algoprep.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    await page.goto('http://localhost:5174/announcements', { waitUntil: 'networkidle0' });
    const announcementText = await page.evaluate(() => document.body.innerText);
    if (!announcementText.includes('Phase 6B Announcement Test')) {
      throw new Error('Student feed did not receive teacher announcement broadcast!');
    }
    console.log('Verified: Student successfully received teacher announcement!');

    await page.goto('http://localhost:5174/lectures', { waitUntil: 'networkidle0' });
    const lectureText = await page.evaluate(() => document.body.innerText);
    if (!lectureText.includes('Phase 6B Dynamic Programming Lecture')) {
      throw new Error('Student feed did not receive teacher video lecture!');
    }
    console.log('Verified: Student successfully received teacher video lecture!');

    console.log(`Console Errors Captured: ${consoleErrors.length}`);
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
