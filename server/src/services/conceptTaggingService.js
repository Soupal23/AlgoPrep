import { Test } from '../models/Test.js';
import { Question } from '../models/Question.js';
import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';
import { z } from 'zod';

const taggingResponseSchema = z.array(
  z.object({
    questionId: z.string(),
    concept: z.string().min(1).max(80),
    difficulty: z.enum(['easy', 'medium', 'hard'])
  })
);

/**
 * Ensures all questions belonging to a test have concept & difficulty tags.
 * Performs tag-on-first-use using atomic locks on the Test model.
 */
export async function ensureTestTagged(testId) {
  try {
    const test = await Test.findById(testId);
    if (!test) {
      return { tagged: false, reason: 'test_not_found' };
    }

    const questions = await Question.find({ testId: test._id }).sort({ order: 1 });
    if (!questions || questions.length === 0) {
      return { tagged: true, newlyTagged: false };
    }

    const untaggedQuestions = questions.filter((q) => !q.concept || !q.difficulty);
    if (untaggedQuestions.length === 0) {
      return { tagged: true, newlyTagged: false };
    }

    // Attempt atomic lock acquisition
    const now = new Date();
    const lockAcquired = await Test.findOneAndUpdate(
      {
        _id: test._id,
        $or: [
          { 'conceptTagging.status': { $in: ['none', 'failed', 'done'] } },
          { 'conceptTagging.lockedUntil': { $lt: now } },
          { 'conceptTagging.lockedUntil': null }
        ]
      },
      {
        $set: {
          'conceptTagging.status': 'in_progress',
          'conceptTagging.lockedUntil': new Date(Date.now() + 60000)
        },
        $inc: { 'conceptTagging.attempts': 1 }
      },
      { new: true }
    );

    if (!lockAcquired) {
      // Another worker/request is actively tagging this test. Poll briefly.
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const recheckTest = await Test.findById(test._id);
        if (recheckTest?.conceptTagging?.status === 'done') {
          return { tagged: true, newlyTagged: false };
        }
      }
      return { tagged: false, reason: 'concurrency_lock' };
    }

    // Fetch existing concepts used in the same topic for taxonomy consistency
    const similarTests = await Test.find({ topic: test.topic }, '_id');
    const testIds = similarTests.map((t) => t._id);
    const existingConcepts = await Question.distinct('concept', {
      testId: { $in: testIds },
      concept: { $ne: null }
    });

    let taggingResults = [];

    if (config.geminiApiKey) {
      try {
        taggingResults = await tagQuestionsWithAI(test, questions, existingConcepts);
      } catch (err) {
        console.warn(`Tagging with AI failed for test ${testId}:`, err.message);
      }
    }

    // Fallback tagging if AI is unavailable or failed
    if (!taggingResults || taggingResults.length === 0) {
      taggingResults = untaggedQuestions.map((q) => {
        // Derive clean concept title from question text or topic
        let derivedConcept = test.topic || 'General';
        const text = q.questionText || '';
        const match = text.match(/about\s+([A-Za-z0-9\s-]{3,30})|on\s+([A-Za-z0-9\s-]{3,30})/i);
        if (match) {
          derivedConcept = (match[1] || match[2]).trim();
        }

        return {
          questionId: q._id.toString(),
          concept: derivedConcept.slice(0, 60),
          difficulty: 'medium'
        };
      });
    }

    // Apply tags safely (only filling null fields)
    await applyTags(taggingResults);

    await Test.findByIdAndUpdate(test._id, {
      $set: {
        'conceptTagging.status': 'done',
        'conceptTagging.lockedUntil': null,
        'conceptTagging.lastError': null
      }
    });

    return { tagged: true, newlyTagged: true };
  } catch (error) {
    console.error('ensureTestTagged error:', error);
    try {
      await Test.findByIdAndUpdate(testId, {
        $set: {
          'conceptTagging.status': 'failed',
          'conceptTagging.lockedUntil': null,
          'conceptTagging.lastError': error.message
        }
      });
    } catch {
      // Ignore cleanup error
    }
    return { tagged: false, reason: error.message };
  }
}

/**
 * Calls Gemini to infer concepts and difficulties across questions in one batch.
 */
async function tagQuestionsWithAI(test, questions, existingConcepts = []) {
  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

  const questionPayload = questions.map((q) => ({
    questionId: q._id.toString(),
    order: q.order,
    questionText: q.questionText,
    explanation: q.explanation
  }));

  const prompt = `You are a Senior Computer Science Curriculum Architect.
Analyze the following exam questions for the test "${test.title}" (Topic: ${test.topic}).
For each question, assign:
1. "concept": A concise, standard CS sub-topic/concept name (e.g. "Deadlocks", "Virtual Memory", "B-Trees", "TCP Handshake", "Polymorphism").
   Prefer reusing any of these existing canonical concepts if they apply: ${JSON.stringify(existingConcepts.slice(0, 30))}.
2. "difficulty": Exactly one of "easy", "medium", or "hard".

Questions to classify:
${JSON.stringify(questionPayload, null, 2)}

Respond ONLY with a JSON array conforming to this schema:
[
  {
    "questionId": "string",
    "concept": "string",
    "difficulty": "easy" | "medium" | "hard"
  }
]`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json'
    }
  });

  const parsed = JSON.parse(response.text);
  const validated = taggingResponseSchema.safeParse(parsed);

  if (!validated.success) {
    console.warn('Tagging response validation failed:', validated.error);
    return [];
  }

  return validated.data;
}

/**
 * Applies tags with bulkWrite, updating only questions whose concept or difficulty is null.
 */
export async function applyTags(taggingResults) {
  if (!taggingResults || taggingResults.length === 0) return;

  const ops = taggingResults.map((item) => ({
    updateOne: {
      filter: {
        _id: item.questionId,
        $or: [{ concept: null }, { difficulty: null }]
      },
      update: {
        $set: {
          concept: item.concept,
          difficulty: item.difficulty,
          tagSource: 'ai_inferred'
        }
      }
    }
  }));

  await Question.bulkWrite(ops);
}
