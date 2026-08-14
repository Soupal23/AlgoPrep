import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
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

  // Only remove demo accounts so custom user-registered accounts are NEVER deleted
  await User.deleteMany({ email: { $in: ['student@algoprep.com', 'admin@algoprep.com'] } });
  await Test.deleteMany({});
  await Question.deleteMany({});
  await Attempt.deleteMany({});

  console.log('Cleared test records and refreshed demo accounts.');

  const defaultPassword = await bcrypt.hash('password123', 10);
  const demoUser = await User.create({
    name: 'Alex Student',
    email: 'student@algoprep.com',
    password: defaultPassword,
    role: 'student'
  });

  const adminUser = await User.create({
    name: 'Admin Instructor',
    email: 'admin@algoprep.com',
    password: defaultPassword,
    role: 'admin'
  });

  console.log(`Created demo users: ${demoUser.email} & ${adminUser.email}`);

  for (const testItem of seedTestsData) {
    const testDoc = await Test.create({
      title: testItem.title,
      description: testItem.description,
      topic: testItem.topic,
      timeLimitMinutes: testItem.timeLimitMinutes,
      markingScheme: testItem.markingScheme,
      totalQuestions: testItem.questions.length,
      createdBy: adminUser._id
    });

    const questionDocs = testItem.questions.map((q) => ({
      testId: testDoc._id,
      questionText: q.questionText,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
      explanation: q.explanation,
      order: q.order
    }));

    await Question.insertMany(questionDocs);
    console.log(`Seeded Test: "${testDoc.title}" (${testItem.questions.length} questions)`);
  }

  console.log('--- Seed Completed Successfully! ---');
};

if (process.argv[1]?.includes('seed')) {
  runSeed().then(() => {
    disconnectDB();
    process.exit(0);
  }).catch((err) => {
    console.error('Seed Error:', err);
    process.exit(1);
  });
}
