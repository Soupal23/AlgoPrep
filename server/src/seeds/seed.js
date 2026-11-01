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

  // Clear demo accounts and test data
  await User.deleteMany({ email: { $in: ['student@algoprep.com', 'admin@algoprep.com', 'soupalpurkayastha@gmail.com'] } });
  await Test.deleteMany({});
  await Question.deleteMany({});
  await Attempt.deleteMany({});

  console.log('Cleared test records and refreshed demo accounts.');

  // Demo Admin
  const adminRawPassword = '_algoprep1234';
  const adminHashedPassword = await bcrypt.hash(adminRawPassword, 10);

  const demoAdmin = await User.create({
    name: 'Soupal Purkayastha',
    email: 'soupalpurkayastha@gmail.com',
    password: adminHashedPassword,
    role: 'admin',
    isActive: true
  });

  console.log(`Created demo admin: ${demoAdmin.email}`);

  // Seed core platform tests
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
      createdBy: demoAdmin._id,
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
    console.log(`Seeded Test: "${testDoc.title}" (${testItem.questions.length} questions)`);
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
