/**
 * Versioned Prompts Registry
 * Centralized catalog of all AI prompt templates used throughout AlgoPrep v2.
 */

export const PROMPTS = {
  // 1. Topic Extraction from Syllabus / Materials
  'roadmap.extractTopics.v1': {
    version: '1.0.0',
    system: `You are an expert curriculum designer and academic instructor for Computer Science.
Your job is to analyze study materials or a syllabus and extract a clean, non-overlapping list of essential concepts/topics that a student must learn.`,
    template: ({ syllabusText, level = 'intermediate' }) => `
Analyze the following study material / syllabus:
"""
${syllabusText}
"""

Target student level: ${level}

Extract the comprehensive list of core topics. For each topic provide:
- key: a unique kebab-case identifier (e.g. "binary-search-trees", "backpropagation")
- title: concise title
- description: clear summary of what this concept entails
- difficulty: 'easy' | 'medium' | 'hard'
- estMinutes: estimated study time in minutes (between 30 and 180)
- prerequisites: array of topic keys that must be studied before this topic
`
  },

  // 2. Day-wise Schedule & Objectives Generation
  'roadmap.schedule.v1': {
    version: '1.0.0',
    system: `You are an expert academic planner. Organize the topics into a logical day-by-day learning plan.`,
    template: ({ topics, days, hoursPerDay }) => `
We have ${topics.length} topics to schedule across ${days} days, with approximately ${hoursPerDay} hours per day.

Topics list:
${JSON.stringify(topics, null, 2)}

Produce a day-wise plan. For each day specify:
- dayNumber: integer (1 to ${days})
- title: concise theme for the day
- objectives: array of 2-4 concrete learning goals
- topicKeys: array of topic keys assigned to this day
`
  },

  // 3. Grounded Notes Generation (RAG)
  'notes.section.v1': {
    version: '1.0.0',
    system: `You are a high-level academic tutor.
Explain concepts clearly using LaTeX for mathematics where appropriate ($...$ for inline, $$...$$ for blocks).
Ground your explanations in the provided context passages. When referencing source materials, cite them as [C1], [C2], etc.
If the context does not fully cover an aspect, clearly note it as "Beyond provided materials".`,
    template: ({ topicTitle, topicDescription, contextPassages }) => `
Topic: "${topicTitle}"
Description: ${topicDescription}

Context Passages from Student Materials:
${contextPassages.map((p, idx) => `[C${idx + 1}] (Source: ${p.source}):\n${p.text}`).join('\n\n')}

Write comprehensive, deeply engaging study notes for this topic. Include:
1. Core Intuition & Definitions
2. Detailed Explanation with Examples
3. Key Takeaways & Common Pitfalls
`
  },

  // 4. Quick / Day Test Question Generation
  'test.generateQuestions.v1': {
    version: '1.0.0',
    system: `You are a strict, high-caliber Computer Science exam creator.
Generate rigorous multiple-choice questions with 4 options and exactly one correct answer.
Explanations must be thorough and educational.`,
    template: ({ topic, count = 10, context = '' }) => `
Generate ${count} high-quality questions on topic: "${topic}".
${context ? `Use the following reference material to ground questions:\n"""\n${context}\n"""` : ''}

For each question:
- questionText: clear, unambiguous problem statement
- options: array of exactly 4 strings
- correctOptionIndex: index 0 to 3
- explanation: detailed explanation why the correct option is right and others are wrong
- difficulty: 'easy' | 'medium' | 'hard'
`
  },

  // 5. External Resource Query Generator
  'resources.queries.v1': {
    version: '1.0.0',
    system: `You are a research query assistant. Generate highly targeted search queries to find the best video tutorials, articles, and documentation for a computer science topic.`,
    template: ({ topicTitle, topicDescription }) => `
Topic: "${topicTitle}"
Description: "${topicDescription}"

Generate 3-4 specific search queries (e.g. for YouTube, web tutorials, papers) ranging from conceptual intuition to hands-on examples.
`
  }
};

export const getPrompt = (name, vars = {}) => {
  const promptDef = PROMPTS[name];
  if (!promptDef) {
    throw new Error(`Prompt template "${name}" not found in registry`);
  }

  return {
    version: promptDef.version,
    system: promptDef.system,
    text: promptDef.template(vars)
  };
};
