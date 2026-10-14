import { Test } from '../models/Test.js';
import { Question } from '../models/Question.js';
import { generateGeminiContent } from '../utils/geminiClient.js';
import { config } from '../config/env.js';
import { z } from 'zod';

const taggingResponseSchema = z.array(
  z.object({
    questionId: z.string(),
    concept: z.string().min(1).max(80),
    difficulty: z.enum(['easy', 'medium', 'hard'])
  })
);

export function isJunkConcept(concept) {
  if (!concept || typeof concept !== 'string') return true;
  const trimmed = concept.trim();
  if (trimmed.length < 3) return true;

  // Preposition/conjunction/fragment starter (e.g. "of a complex object...", "logic to client", "to ", "in ", "for ")
  if (/^(of|on|in|to|for|with|by|at|from|about|logic to|as a|that)\b/i.test(trimmed)) {
    return true;
  }

  // Starts with lowercase letter (canonical CS concepts are Title Case, e.g. "Builder Pattern", "Deadlocks")
  if (/^[a-z]/.test(trimmed)) {
    return true;
  }

  // Fragment check: ends with trailing preposition/conjunction/incomplete word (e.g. "...from its", "...or", "...its r")
  if (/\b(or|and|from|with|by|its|the|an|a|to|of)$/i.test(trimmed)) {
    return true;
  }
  if (/\b[a-z]{1,2}$/i.test(trimmed) && trimmed.length > 15) {
    return true;
  }

  return false;
}

export function isGenericTopicConcept(concept, testTopic = '', testTitle = '') {
  if (!concept || typeof concept !== 'string') return true;
  const c = concept.trim().toLowerCase();
  const topic = (testTopic || '').trim().toLowerCase();
  const title = (testTitle || '').trim().toLowerCase();

  // Exactly equals parent topic (e.g. "Object-Oriented Programming" in an OOP test)
  if (topic && c === topic) return true;

  // Exactly equals test title (e.g. "OOP Test 5: Design Patterns & Behavioral Architecture")
  if (title && c === title) return true;

  // Generic filler values
  const genericFillers = [
    'general',
    'general principles',
    'computer science',
    'assessment',
    'mcq assessment',
    'fundamentals',
    'computer science assessment'
  ];
  if (genericFillers.includes(c)) return true;

  return false;
}

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

    const needsTagging = questions.filter(
      (q) => !q.concept || !q.difficulty || isJunkConcept(q.concept) || isGenericTopicConcept(q.concept, test.topic, test.title)
    );
    if (needsTagging.length === 0) {
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
        const cleanExisting = existingConcepts.filter((c) => !isJunkConcept(c) && !isGenericTopicConcept(c, test.topic, test.title));
        taggingResults = await tagQuestionsWithAI(test, questions, cleanExisting);
      } catch (err) {
        console.warn(`Tagging with AI failed for test ${testId}:`, err.message);
      }
    }

    // Fallback tagging if AI is unavailable or failed
    if (!taggingResults || taggingResults.length === 0) {
      taggingResults = needsTagging.map((q) => {
        let derivedConcept = '';

        // Check if correct option or any option is a clean Title Case CS concept name (e.g. "Builder Pattern")
        const correctOpt = q.options && q.options[q.correctOptionIndex];
        if (
          correctOpt &&
          /^[A-Z][A-Za-z0-9\s-]{2,40}$/.test(correctOpt) &&
          !isJunkConcept(correctOpt) &&
          !isGenericTopicConcept(correctOpt, test.topic, test.title)
        ) {
          derivedConcept = correctOpt.trim();
        } else if (test.title) {
          const subTitle = test.title.replace(/.*Test\s*\d*:\s*/i, '').trim();
          derivedConcept = subTitle || `${test.topic} - Module ${q.order}`;
        } else {
          derivedConcept = `${test.topic} - Part ${q.order}`;
        }

        return {
          questionId: q._id.toString(),
          concept: derivedConcept.slice(0, 60),
          difficulty: q.difficulty || 'medium'
        };
      });
    }

    // Apply tags safely
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
  const questionPayload = questions.map((q) => ({
    questionId: q._id.toString(),
    order: q.order,
    questionText: q.questionText,
    explanation: q.explanation
  }));

  const prompt = `You are a Senior Computer Science Curriculum Architect.
Analyze the following exam questions for the test "${test.title}" (Topic: ${test.topic}).
For each question, assign:
1. "concept": A concise, standard, specific CS sub-topic, pattern, algorithm, or mechanism (e.g. "Builder Pattern", "Observer Pattern", "Deadlocks", "Virtual Memory", "B-Trees", "TCP Handshake", "Polymorphism").
   CRITICAL REQUIREMENT:
   - Do NOT output the broad course or topic name itself (do NOT output "${test.topic}", "Computer Science", or general fillers).
   - Output the specific sub-concept tested.
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

  const response = await generateGeminiContent({
    prompt,
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
        _id: item.questionId
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
