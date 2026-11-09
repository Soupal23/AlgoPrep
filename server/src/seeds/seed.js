import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { Test } from '../models/Test.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { seedTestsData } from './seedData.js';

export const runSeed = async () => {
  console.log('--- Starting AlgoPrep Database Seed ---');
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }

  const shouldReset = process.argv.includes('--reset') || process.env.RESET_DB === 'true';

  if (shouldReset) {
    console.log('RESET requested: clearing existing platform tests, questions, and attempts...');
    await Test.deleteMany({ kind: 'platform' });
    await Question.deleteMany({});
    await Attempt.deleteMany({});
  }

  // 1. Seed or update Admin Account
  const adminEmail = (config.adminSeedEmail || 'admin@algoprep.com').toLowerCase();
  let adminUser = await User.findOne({ email: adminEmail });

  if (config.adminSeedPassword) {
    const adminHashedPassword = await bcrypt.hash(config.adminSeedPassword, 10);
    if (!adminUser) {
      adminUser = await User.create({
        name: 'AlgoPrep Administrator',
        email: adminEmail,
        password: adminHashedPassword,
        role: 'admin',
        isActive: true
      });
      console.log(`Created admin user: ${adminEmail}`);
    } else {
      adminUser.password = adminHashedPassword;
      adminUser.role = 'admin';
      adminUser.isActive = true;
      await adminUser.save();
      console.log(`Updated admin user password: ${adminEmail}`);
    }
  } else if (config.nodeEnv !== 'production') {
    const devAdminPass = 'admin123456';
    const adminHashedPassword = await bcrypt.hash(devAdminPass, 10);
    if (!adminUser) {
      adminUser = await User.create({
        name: 'AlgoPrep Dev Admin',
        email: adminEmail,
        password: adminHashedPassword,
        role: 'admin',
        isActive: true
      });
      console.log(`[DEV ONLY] Created dev admin: ${adminEmail} (password: ${devAdminPass})`);
    }
  } else {
    console.log('Skipping admin user creation: ADMIN_SEED_PASSWORD is not configured in production.');
  }

  // 2. In non-production environments, seed demo student for test suites and dev preview
  if (config.nodeEnv !== 'production') {
    const studentEmail = 'student@algoprep.com';
    let demoStudent = await User.findOne({ email: studentEmail });
    if (!demoStudent) {
      const studentHashedPassword = await bcrypt.hash('password123', 10);
      demoStudent = await User.create({
        name: 'Alex Student',
        email: studentEmail,
        password: studentHashedPassword,
        role: 'student',
        isActive: true
      });
      console.log(`[DEV ONLY] Created demo student: ${studentEmail}`);
    }
  }

  // 3. Seed platform tests (25 tests, 375 MCQs) if not already present
  const platformTestCount = await Test.countDocuments({ kind: 'platform' });
  if (platformTestCount === 0 || shouldReset) {
    console.log(`Seeding ${seedTestsData.length} platform tests...`);
    const adminId = adminUser ? adminUser._id : null;

    for (const testItem of seedTestsData) {
      const testDoc = await Test.create({
        title: testItem.title,
        description: testItem.description,
        topic: testItem.topic,
        timeLimitMinutes: testItem.timeLimitMinutes,
        markingScheme: testItem.markingScheme,
        totalQuestions: testItem.questions.length,
        kind: 'platform',
        mode: 'exam',
        ownerId: null,
        createdBy: adminId,
        conceptTagging: {
          status: 'done'
        }
      });

      const questionDocs = testItem.questions.map((q) => ({
        testId: testDoc._id,
        questionText: q.questionText,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        explanation: q.explanation,
        order: q.order,
        concept: q.concept || testItem.topic,
        difficulty: q.difficulty || (q.order % 3 === 1 ? 'easy' : q.order % 3 === 2 ? 'medium' : 'hard'),
        tagSource: 'ai_inferred'
      }));

      await Question.insertMany(questionDocs);
    }
    console.log(`Seeded all ${seedTestsData.length} platform tests successfully!`);
  } else {
    console.log(`Platform tests already exist (${platformTestCount} tests found). Skipping platform test seed.`);
  }

  console.log('--- Seed Completed Successfully! ---');
};

if (process.argv[1]?.includes('seed')) {
  runSeed()
    .then(() => {
      disconnectDB();
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed Error:', err);
      process.exit(1);
    });
}
