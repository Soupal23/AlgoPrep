import { z } from 'zod';

export const topicItemSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  estMinutes: z.number().min(10).max(360).default(60),
  prerequisites: z.array(z.string()).default([])
});

export const topicsExtractionSchema = z.object({
  topics: z.array(topicItemSchema).min(1)
});

export const dayScheduleItemSchema = z.object({
  dayNumber: z.number().min(1),
  title: z.string().min(1),
  objectives: z.array(z.string()).min(1),
  topicKeys: z.array(z.string()).min(1)
});

export const roadmapScheduleSchema = z.object({
  days: z.array(dayScheduleItemSchema).min(1)
});

export const testQuestionSchema = z.object({
  questionText: z.string().min(1),
  options: z.array(z.string()).length(4),
  correctOptionIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  concept: z.string().optional()
});

export const testGenerationSchema = z.object({
  title: z.string().min(1),
  topic: z.string().min(1),
  description: z.string().min(1),
  questions: z.array(testQuestionSchema).min(1)
});

export const resourceQueriesSchema = z.object({
  queries: z.array(z.string()).min(1).max(6)
});
