import { describe, it, expect } from 'vitest';
import { calculateScore } from '../src/utils/scoring.js';
import mongoose from 'mongoose';

describe('Scoring Logic Utility', () => {
  const dummyQuestions = [
    {
      _id: new mongoose.Types.ObjectId(),
      questionText: 'Q1',
      options: ['A', 'B', 'C', 'D'],
      correctOptionIndex: 0,
      explanation: 'Exp1',
      order: 1
    },
    {
      _id: new mongoose.Types.ObjectId(),
      questionText: 'Q2',
      options: ['A', 'B', 'C', 'D'],
      correctOptionIndex: 1,
      explanation: 'Exp2',
      order: 2
    },
    {
      _id: new mongoose.Types.ObjectId(),
      questionText: 'Q3',
      options: ['A', 'B', 'C', 'D'],
      correctOptionIndex: 2,
      explanation: 'Exp3',
      order: 3
    },
    {
      _id: new mongoose.Types.ObjectId(),
      questionText: 'Q4',
      options: ['A', 'B', 'C', 'D'],
      correctOptionIndex: 3,
      explanation: 'Exp4',
      order: 4
    }
  ];

  const markingScheme = { correct: 4, incorrect: -1 };

  it('should compute full score for all correct answers', () => {
    const q1Id = dummyQuestions[0]._id.toString();
    const q2Id = dummyQuestions[1]._id.toString();
    const q3Id = dummyQuestions[2]._id.toString();
    const q4Id = dummyQuestions[3]._id.toString();

    const answers = {
      [q1Id]: 0,
      [q2Id]: 1,
      [q3Id]: 2,
      [q4Id]: 3
    };

    const result = calculateScore(answers, dummyQuestions, markingScheme);

    expect(result.score).toBe(16);
    expect(result.maxScore).toBe(16);
    expect(result.correctCount).toBe(4);
    expect(result.incorrectCount).toBe(0);
    expect(result.unattemptedCount).toBe(0);
    expect(result.accuracy).toBe(100);
  });

  it('should apply negative marking for incorrect answers and 0 for unattempted', () => {
    const q1Id = dummyQuestions[0]._id.toString();
    const q2Id = dummyQuestions[1]._id.toString();
    const q4Id = dummyQuestions[3]._id.toString();

    const answers = {
      [q1Id]: 0,
      [q2Id]: 3,
      [q4Id]: 1
    };

    const result = calculateScore(answers, dummyQuestions, markingScheme);

    expect(result.score).toBe(2);
    expect(result.maxScore).toBe(16);
    expect(result.correctCount).toBe(1);
    expect(result.incorrectCount).toBe(2);
    expect(result.unattemptedCount).toBe(1);
    expect(result.accuracy).toBe(33.3);
  });
});
