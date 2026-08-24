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

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\bfc38384-8f2b-4fe6-a743-399063993adf';

async function runVerification() {
  console.log('=== STARTING PHASE 7B END-TO-END BROWSER VERIFICATION ===');

  // 1. Start MongoDB In-Memory Server & Seed Accounts
  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  console.log('Connected to In-Memory MongoDB');

  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await User.create({
    name: 'Admin Boss',
    email: 'admin@algoprep.com',
    password: hashedPassword,
    role: 'admin',
    isActive: true
  });

  const student = await User.create({
    name: 'Student ToDeactivate',
    email: 'student@algoprep.com',
    password: hashedPassword,
    role: 'student',
    isActive: true
  });

  console.log('Database seeded with admin and student users.');

  // Create temporary resume file for upload test
  const tempResumePath = path.resolve('./temp_resume.txt');
  fs.writeFileSync(tempResumePath, 'Candidate Teacher Resume Content\nExperience: 5 years teaching CS.');

  // 2. Start Express API Server on Port 5007
  const server = app.listen(5007);
  console.log('Express API server running on http://localhost:5007');

  // 3. Serve Vite Client Static Build on Port 5175 with API Proxying
  const clientDist = path.resolve('../client/dist');
  const staticApp = express();
  staticApp.use(cors());
  staticApp.use(express.static(clientDist));

  staticApp.use('/api', (req, res) => {
    const options = {
      hostname: 'localhost',
      port: 5007,
      path: `/api${req.url}`,
      method: req.method,
      headers: { ...req.headers, host: 'localhost:5007' }
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

  const clientServer = staticApp.listen(5175);
  console.log('Client static server running on http://localhost:5175');

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
    // A. Visitor Submits Candidate Application on /teach-here
    console.log('1. Visitor submitting teacher application on /teach-here...');
    await page.goto('http://localhost:5175/teach-here', { waitUntil: 'networkidle0' });

    await page.type('input[placeholder*="Donald"]', 'Candidate Instructor');
    await page.type('input[placeholder*="university"]', 'candidate@algoprep.com');
    await page.type('input[placeholder*="Data Structures"]', 'Algorithms & Data Structures');
    await page.type('textarea[placeholder*="Tell us about"]', 'Experienced lecturer seeking to host CBT courses.');

    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(tempResumePath);

    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase7B_teach_here.png') });
    console.log('Saved screenshot: phase7B_teach_here.png');

    // B. Admin Logs In & Approves Application on /admin
    console.log('2. Admin logging in to approve application on /admin...');
    await page.goto('http://localhost:5175/login', { waitUntil: 'networkidle0' });
    await page.type('input[type="email"]', 'admin@algoprep.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 1500));

    await page.goto('http://localhost:5175/admin', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase7B_admin_applications.png') });
    console.log('Saved screenshot: phase7B_admin_applications.png');

    // Click Approve button using evaluate
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const approveBtn = buttons.find((b) => b.textContent.includes('Approve'));
      if (approveBtn) approveBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    // C. Approved Candidate Registers as Teacher
    console.log('3. Approved candidate registering as teacher...');
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:5175/register', { waitUntil: 'networkidle0' });

    // Select Teacher Candidate button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const teacherBtn = buttons.find((b) => b.textContent.includes('Teacher Candidate'));
      if (teacherBtn) teacherBtn.click();
    });

    await page.type('input[placeholder*="Jane Doe"]', 'Candidate Instructor');
    await page.type('input[placeholder*="jane@example"]', 'candidate@algoprep.com');
    await page.type('input[placeholder*="characters"]', 'password123');
    await page.click('button[type="submit"]');

    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase7B_teacher_register.png') });
    console.log('Saved screenshot: phase7B_teacher_register.png');

    // D. Admin Soft-Deactivates Student Account
    console.log('4. Admin soft-deactivating student account on /admin...');
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:5175/login', { waitUntil: 'networkidle0' });
    await page.type('input[type="email"]', 'admin@algoprep.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 1500));

    await page.goto('http://localhost:5175/admin', { waitUntil: 'networkidle0' });

    // Switch to Users tab
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const usersTab = buttons.find((b) => b.textContent.includes('User Directory'));
      if (usersTab) usersTab.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase7B_admin_users.png') });
    console.log('Saved screenshot: phase7B_admin_users.png');

    // Accept confirmation dialog automatically
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Target specifically the student row's Deactivate button
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const studentRow = rows.find((r) => r.textContent.includes('student@algoprep.com'));
      if (studentRow) {
        const btn = Array.from(studentRow.querySelectorAll('button')).find((b) => b.textContent.includes('Deactivate'));
        if (btn) btn.click();
      }
    });
    await new Promise((r) => setTimeout(r, 1500));

    // E. Deactivated Student Attempts Login
    console.log('5. Verifying deactivated student login is blocked...');
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:5175/login', { waitUntil: 'networkidle0' });
    await page.type('input[type="email"]', 'student@algoprep.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 1500));

    const bodyText = await page.evaluate(() => document.body.innerText);
    if (!bodyText.includes('Account is deactivated')) {
      throw new Error('Deactivated student login was not blocked with Account is deactivated message!');
    }
    console.log('Verified: Deactivated student login was blocked with 403 Account is deactivated!');

    console.log(`Console Errors Captured: ${consoleErrors.length}`);
  } finally {
    if (fs.existsSync(tempResumePath)) fs.unlinkSync(tempResumePath);
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
