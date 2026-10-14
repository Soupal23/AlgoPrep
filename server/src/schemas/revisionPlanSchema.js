import { z } from 'zod';

export const resourceItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  url: z.string().url(),
  type: z.enum(['article', 'video', 'book', 'practice', 'course', 'documentation']),
  minutes: z.number().nonnegative().default(15),
  aiSuggested: z.boolean().optional().default(false)
});

export const weakConceptSchema = z.object({
  concept: z.string().min(1),
  conceptKey: z.string().min(1),
  priority: z.enum(['high', 'medium', 'low']),
  issueType: z.enum(['misconception', 'knowledge_gap', 'careless', 'uncertain']),
  questionOrders: z.array(z.number().int().positive()),
  explanation: z.string().max(600),
  specificMistake: z.string().max(400),
  signals: z.array(z.string()).default([]),
  recurringCount: z.number().int().nonnegative().default(0),
  resourceIds: z.array(z.string()).default([])
});

export const conceptBreakdownItemSchema = z.object({
  concept: z.string().min(1),
  total: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  incorrect: z.number().int().nonnegative(),
  unattempted: z.number().int().nonnegative()
});

export const revisionPlanSchema = z.object({
  version: z.number().int().default(1),
  source: z.enum(['ai', 'fallback']),
  generatedAt: z.string(),
  summary: z.object({
    verdict: z.string().min(1).max(300),
    performanceLevel: z.enum(['mastery', 'intermediate', 'needs_revision']),
    estimatedStudyMinutes: z.number().int().nonnegative(),
    encouragement: z.string().max(300)
  }),
  stats: z.object({
    correct: z.number().int().nonnegative(),
    incorrect: z.number().int().nonnegative(),
    unattempted: z.number().int().nonnegative(),
    accuracy: z.number().nonnegative(),
    score: z.number(),
    maxScore: z.number(),
    avgSecondsPerQuestion: z.number().nonnegative().default(0),
    previousAttempt: z
      .object({
        score: z.number(),
        accuracy: z.number(),
        submittedAt: z.string()
      })
      .nullable()
      .default(null)
  }),
  conceptBreakdown: z.array(conceptBreakdownItemSchema).default([]),
  weakConcepts: z.array(weakConceptSchema).default([]),
  strengths: z.array(z.string()).default([]),
  resources: z.array(resourceItemSchema).default([])
});
