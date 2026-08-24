import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { connectDB, disconnectDB } from '../config/db.js';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { Test } from '../models/Test.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { Membership } from '../models/Membership.js';
import { Announcement } from '../models/Announcement.js';
import { RecordedLecture } from '../models/RecordedLecture.js';
import { seedTestsData } from './seedData.js';

export const runSeed = async () => {
  console.log('--- Starting AlgoPrep Database Seed ---');
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }

  // Clear demo accounts and test data
  await User.deleteMany({ email: { $in: ['student@algoprep.com', 'teacher@algoprep.com', 'admin@algoprep.com'] } });
  await Test.deleteMany({});
  await Question.deleteMany({});
  await Attempt.deleteMany({});

  console.log('Cleared test records and refreshed demo accounts.');

  const defaultPassword = await bcrypt.hash('password123', 10);

  // 1. Demo Student
  const demoStudent = await User.create({
    name: 'Alex Student',
    email: 'student@algoprep.com',
    password: defaultPassword,
    role: 'student',
    bio: 'Computer science student preparing for CBT assessments.',
    isActive: true
  });

  // 2. Demo Teacher
  const demoTeacher = await User.create({
    name: 'Prof Alan Turing',
    email: 'teacher@algoprep.com',
    password: defaultPassword,
    role: 'teacher',
    bio: 'Pioneer of theoretical computer science, algorithms, and AI.',
    subjectFocus: 'Algorithms & Data Structures',
    isActive: true
  });

  // 3. Demo Admin
  let adminRawPassword = config.adminSeedPassword || 'password123';
  const adminHashedPassword = await bcrypt.hash(adminRawPassword, 10);

  const demoAdmin = await User.create({
    name: 'Admin Instructor',
    email: 'admin@algoprep.com',
    password: adminHashedPassword,
    role: 'admin',
    isActive: true
  });

  // Create membership between demo student and demo teacher
  await Membership.create({
    studentId: demoStudent._id,
    teacherId: demoTeacher._id,
    status: 'active'
  });

  // Create sample announcement
  await Announcement.create({
    teacherId: demoTeacher._id,
    title: 'Welcome to Advanced Algorithms 101',
    content: 'Class starts this week! Check the lectures tab for video recordings and practice tests.'
  });

  // Create sample recorded lecture
  await RecordedLecture.create({
    teacherId: demoTeacher._id,
    title: 'Lecture 1: Asymptotic Analysis & Big-O Notation',
    description: 'Overview of runtime complexity bounds and dynamic memory optimization.',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
  });

  console.log(`Created demo users:`);
  console.log(` - Student: ${demoStudent.email} (password: password123)`);
  console.log(` - Teacher: ${demoTeacher.email} (password: password123)`);
  console.log(` - Admin:   ${demoAdmin.email} (password: ${adminRawPassword})`);

  // Seed core tests
  for (const testItem of seedTestsData) {
    const testDoc = await Test.create({
      title: testItem.title,
      description: testItem.description,
      topic: testItem.topic,
      timeLimitMinutes: testItem.timeLimitMinutes,
      markingScheme: testItem.markingScheme,
      totalQuestions: testItem.questions.length,
      createdBy: demoAdmin._id
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
