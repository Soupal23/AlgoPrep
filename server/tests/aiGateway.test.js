import { describe, it, expect } from 'vitest';
import { getPrompt, PROMPTS } from '../src/ai/prompts/index.js';
import {
  topicItemSchema,
  topicsExtractionSchema,
  roadmapScheduleSchema,
  testGenerationSchema
} from '../src/ai/schemas/index.js';
import { llmGateway } from '../src/ai/llmGateway.js';
import { embedder } from '../src/ai/embedder.js';

describe('Phase 2 — AI Gateway, Prompts Registry & Embedder', () => {
  it('should retrieve versioned prompt templates and interpolate variables', () => {
    const prompt = getPrompt('roadmap.extractTopics.v1', {
      syllabusText: 'Module 1: Graphs and Trees',
      level: 'intermediate'
    });

    expect(prompt.version).toBe('1.0.0');
    expect(prompt.system).toContain('expert curriculum designer');
    expect(prompt.text).toContain('Module 1: Graphs and Trees');
    expect(prompt.text).toContain('intermediate');
  });

  it('should throw an error for unknown prompt template name', () => {
    expect(() => getPrompt('non.existent.prompt')).toThrow(/not found in registry/i);
  });

  it('should validate structured topic extraction schemas with Zod', () => {
    const validData = {
      topics: [
        {
          key: 'binary-search',
          title: 'Binary Search Algorithm',
          description: 'Divide and conquer search algorithm for sorted collections',
          difficulty: 'easy',
          estMinutes: 45,
          prerequisites: []
        }
      ]
    };

    const parsed = topicsExtractionSchema.safeParse(validData);
    expect(parsed.success).toBe(true);

    const invalidData = {
      topics: [
        {
          key: '',
          title: 'Missing key'
        }
      ]
    };

    const invalidParsed = topicsExtractionSchema.safeParse(invalidData);
    expect(invalidParsed.success).toBe(false);
  });

  it('should validate test generation schema with Zod', () => {
    const validTest = {
      title: 'OS Process Test',
      topic: 'Operating Systems',
      description: 'Covers process states and context switches',
      questions: [
        {
          questionText: 'What is a PCB?',
          options: ['Process Control Block', 'Page Cache Buffer', 'Program Counter Bit', 'Physical Core Bridge'],
          correctOptionIndex: 0,
          explanation: 'PCB stores process metadata.',
          difficulty: 'easy'
        }
      ]
    };

    const parsed = testGenerationSchema.safeParse(validTest);
    expect(parsed.success).toBe(true);
  });

  it('should resolve LLM models according to tier settings', () => {
    expect(llmGateway.resolveModel('fast')).toBeDefined();
    expect(llmGateway.resolveModel('default')).toBeDefined();
    expect(llmGateway.resolveModel('reasoning')).toBeDefined();
  });

  it('should compute consistent SHA-256 hashes and cache embeddings in memory', () => {
    const hash1 = embedder.hash('test string for embedding');
    const hash2 = embedder.hash('test string for embedding');
    const hash3 = embedder.hash('different string');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);

    const dummyVector = [0.1, 0.2, 0.3];
    embedder.cache.set(hash1, dummyVector);
    expect(embedder.cache.get(hash1)).toEqual(dummyVector);
  });
});
