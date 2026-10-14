import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { isApprovedDomain } from '../src/data/approvedDomains.js';
import { selectCandidates } from '../src/data/resourceCatalog.js';
import {
  buildSignals,
  buildFallbackPlan,
  normalizeConceptKey
} from '../src/services/revisionPlanService.js';
import { revisionPlanSchema } from '../src/schemas/revisionPlanSchema.js';

describe('Revision Plan Subsystem Unit Tests', () => {
  describe('Approved Domains Whitelist Validator', () => {
    it('should approve canonical approved HTTPS URLs', () => {
      expect(isApprovedDomain('https://geeksforgeeks.org/operating-systems/')).toBe(true);
      expect(isApprovedDomain('https://www.geeksforgeeks.org/deadlocks/')).toBe(true);
      expect(isApprovedDomain('https://developer.mozilla.org/en-US/docs/Web')).toBe(true);
      expect(isApprovedDomain('https://ocw.mit.edu/courses/electrical-engineering/')).toBe(true);
      expect(isApprovedDomain('https://visualgo.net/en/bst')).toBe(true);
    });

    it('should reject non-HTTPS URLs', () => {
      expect(isApprovedDomain('http://geeksforgeeks.org/operating-systems/')).toBe(false);
      expect(isApprovedDomain('http://ocw.mit.edu')).toBe(false);
    });

    it('should reject deceptive look-alike domains and unapproved origins', () => {
      expect(isApprovedDomain('https://geeksforgeeks.org.attacker.com/malware')).toBe(false);
      expect(isApprovedDomain('https://mit.edu.phishing.io/')).toBe(false);
      expect(isApprovedDomain('https://unknown-random-blog.com/os-tips')).toBe(false);
      expect(isApprovedDomain('not-a-valid-url')).toBe(false);
    });
  });

  describe('Resource Catalog Candidate Selection', () => {
    it('should return matching resources for recognized topics and concept keys', () => {
      const osCandidates = selectCandidates('Operating Systems', ['deadlocks', 'cpu_scheduling']);
      expect(osCandidates.length).toBeGreaterThan(0);
      expect(osCandidates.some((c) => c.concepts.includes('deadlocks'))).toBe(true);
    });

    it('should return empty list for custom syllabus topics without hardcoded resources', () => {
      const customCandidates = selectCandidates('Custom Robotic Firmware 101', ['firmware']);
      expect(customCandidates).toEqual([]);
    });
  });

  describe('Signal Extraction & Deterministic Fallback Plan', () => {
    const q1Id = new mongoose.Types.ObjectId();
    const q2Id = new mongoose.Types.ObjectId();
    const q3Id = new mongoose.Types.ObjectId();

    const dummyQuestions = [
      {
        _id: q1Id,
        order: 1,
        questionText: 'What is Peterson solution used for?',
        options: ['Mutual Exclusion', 'Deadlock Recovery', 'Virtual Memory', 'Subnetting'],
        correctOptionIndex: 0,
        explanation: 'Peterson algorithm guarantees mutual exclusion between 2 processes.',
        concept: 'Process Synchronization',
        difficulty: 'medium'
      },
      {
        _id: q2Id,
        order: 2,
        questionText: 'Which condition is NOT required for deadlock?',
        options: ['Mutual Exclusion', 'Hold and Wait', 'Preemption', 'Circular Wait'],
        correctOptionIndex: 2,
        explanation: 'No preemption is required; preemption breaks deadlocks.',
        concept: 'Deadlocks',
        difficulty: 'hard'
      },
      {
        _id: q3Id,
        order: 3,
        questionText: 'What is the function of the Translation Lookaside Buffer?',
        options: ['Cache page translations', 'Schedule threads', 'Encrypt packets', 'Allocate heap'],
        correctOptionIndex: 0,
        explanation: 'TLB caches virtual-to-physical address mappings.',
        concept: 'Virtual Memory',
        difficulty: 'easy'
      }
    ];

    const dummyTest = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Operating Systems Midterm',
      topic: 'Operating Systems'
    };

    it('should extract behavioral signals (fast_wrong, marked_for_review) and build breakdown', async () => {
      const answersMap = new Map();
      answersMap.set(q1Id.toString(), 0); // Correct
      answersMap.set(q2Id.toString(), 1); // Incorrect!
      // q3 is unattempted

      const questionStates = new Map();
      questionStates.set(q2Id.toString(), 'marked');

      const questionTimeSpent = new Map();
      questionTimeSpent.set(q1Id.toString(), 60);
      questionTimeSpent.set(q2Id.toString(), 5); // very fast (< 0.4 * 65s avg) -> fast_wrong

      const attempt = {
        answers: answersMap,
        questionStates,
        questionTimeSpent,
        score: 4,
        maxScore: 12,
        accuracy: 33,
        timeSpentSeconds: 65
      };

      const history = {
        previousAttempt: { score: 0, accuracy: 0, submittedAt: new Date().toISOString() },
        recurringConcepts: { deadlocks: 2 }
      };

      const signals = await buildSignals(attempt, dummyTest, dummyQuestions, history);

      expect(signals.correctCount).toBe(1);
      expect(signals.incorrectCount).toBe(1);
      expect(signals.unattemptedCount).toBe(1);
      expect(signals.conceptBreakdown.length).toBe(3);
      expect(signals.strengths).toContain('Process Synchronization');

      const missedQ2 = signals.missedQuestions.find((m) => m.order === 2);
      expect(missedQ2.signals).toContain('fast_wrong');
      expect(missedQ2.signals).toContain('marked_for_review');
      expect(missedQ2.signals).toContain('recurring');

      // Test fallback plan generation
      const candidates = selectCandidates('Operating Systems', ['deadlocks', 'virtual_memory']);
      const plan = buildFallbackPlan(signals, history, candidates);

      // Validate against strict Zod revisionPlanSchema
      const validated = revisionPlanSchema.safeParse(plan);
      expect(validated.success).toBe(true);

      expect(plan.source).toBe('fallback');
      expect(plan.weakConcepts.length).toBe(2); // Deadlocks + Virtual Memory
      expect(plan.weakConcepts.some((w) => w.concept === 'Deadlocks')).toBe(true);
      expect(plan.weakConcepts.find((w) => w.concept === 'Deadlocks').priority).toBe('high');
      expect(plan.resources.length).toBeGreaterThan(0);
    });

    it('should normalize concept keys reliably', () => {
      expect(normalizeConceptKey('CPU Scheduling & Dispatching!')).toBe('cpu_scheduling_dispatching');
      expect(normalizeConceptKey('   Deadlocks  ')).toBe('deadlocks');
      expect(normalizeConceptKey('')).toBe('general_concept');
    });
  });
});
