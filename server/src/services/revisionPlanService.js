import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { RevisionPlan } from '../models/RevisionPlan.js';
import { revisionPlanSchema } from '../schemas/revisionPlanSchema.js';
import { selectCandidates, RESOURCE_CATALOG } from '../data/resourceCatalog.js';
import { isApprovedDomain } from '../data/approvedDomains.js';
import { generateGeminiContent } from '../utils/geminiClient.js';
import { config } from '../config/env.js';

export function normalizeConceptKey(name = '') {
  return (name || 'general_concept')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Extracts student behavioral signals, time indicators, and deterministic concept stats.
 */
export async function buildSignals(attempt, test, questions, history = {}) {
  const userAnswers = attempt.answers || new Map();
  const questionStates = attempt.questionStates || new Map();
  const timeSpentMap = attempt.questionTimeSpent || new Map();

  const totalQuestions = questions.length || 1;
  const avgSeconds = Math.round((attempt.timeSpentSeconds || 0) / totalQuestions);

  const conceptMap = new Map(); // conceptName -> { total, correct, incorrect, unattempted, questions: [] }
  const missedQuestions = [];

  questions.forEach((q) => {
    const qId = q._id.toString();
    const selected = userAnswers.get ? userAnswers.get(qId) : userAnswers[qId];
    const qState = questionStates.get ? questionStates.get(qId) : questionStates[qId];
    const qTime = timeSpentMap.get ? timeSpentMap.get(qId) : timeSpentMap[qId] || 0;

    let status = 'unattempted';
    let isCorrect = false;

    if (selected !== undefined && selected !== null && selected >= 0) {
      if (selected === q.correctOptionIndex) {
        status = 'correct';
        isCorrect = true;
      } else {
        status = 'incorrect';
      }
    }

    const conceptName = q.concept || (test.topic ? `${test.topic} Fundamentals` : 'General Principles');
    const conceptKey = normalizeConceptKey(conceptName);

    if (!conceptMap.has(conceptName)) {
      conceptMap.set(conceptName, {
        concept: conceptName,
        conceptKey,
        total: 0,
        correct: 0,
        incorrect: 0,
        unattempted: 0,
        questions: []
      });
    }

    const cGroup = conceptMap.get(conceptName);
    cGroup.total += 1;
    if (status === 'correct') cGroup.correct += 1;
    else if (status === 'incorrect') cGroup.incorrect += 1;
    else cGroup.unattempted += 1;

    // Behavioral flags
    const signals = [];
    const isMarked = qState === 'marked' || qState === 'answered_marked';

    if (isMarked) {
      signals.push('marked_for_review');
    }

    if (qTime > 0 && avgSeconds > 0) {
      if (status === 'incorrect' && qTime < 0.4 * avgSeconds) {
        signals.push('fast_wrong'); // Likely guess or careless misread
      } else if (status === 'incorrect' && qTime > 1.6 * avgSeconds) {
        signals.push('slow_wrong'); // Confusion / stuck on concept
      }
    }

    // Historical cross-test recurrence
    const recurringCount = (history.recurringConcepts && history.recurringConcepts[conceptKey]) || 0;
    if (recurringCount > 0) {
      signals.push('recurring');
    }

    const qInfo = {
      questionId: qId,
      order: q.order,
      questionText: q.questionText,
      selectedText: selected !== undefined && selected !== null && selected >= 0 ? q.options[selected] : 'Unattempted',
      correctText: q.options[q.correctOptionIndex],
      explanation: q.explanation,
      status,
      isCorrect,
      timeSpent: qTime,
      isMarked,
      signals,
      concept: conceptName,
      conceptKey,
      difficulty: q.difficulty || 'medium',
      recurringCount
    };

    cGroup.questions.push(qInfo);

    if (!isCorrect) {
      missedQuestions.push(qInfo);
    }
  });

  // Calculate deterministic concept breakdown
  const conceptBreakdown = Array.from(conceptMap.values()).map((c) => ({
    concept: c.concept,
    total: c.total,
    correct: c.correct,
    incorrect: c.incorrect,
    unattempted: c.unattempted
  }));

  // Identify strengths: Concepts where candidate answered at least 1 question correctly and had 0 incorrect answers
  const strengths = Array.from(conceptMap.values())
    .filter((c) => c.correct > 0 && c.incorrect === 0)
    .map((c) => c.concept);

  const correctCount = questions.filter((q) => {
    const qId = q._id.toString();
    const s = userAnswers.get ? userAnswers.get(qId) : userAnswers[qId];
    return s === q.correctOptionIndex;
  }).length;

  const incorrectCount = questions.filter((q) => {
    const qId = q._id.toString();
    const s = userAnswers.get ? userAnswers.get(qId) : userAnswers[qId];
    return s !== undefined && s !== null && s >= 0 && s !== q.correctOptionIndex;
  }).length;

  const unattemptedCount = questions.length - (correctCount + incorrectCount);

  return {
    testTitle: test.title,
    topic: test.topic,
    accuracy: typeof attempt.accuracy === 'number' ? attempt.accuracy : Math.round((correctCount / totalQuestions) * 100),
    score: typeof attempt.score === 'number' ? attempt.score : (correctCount * 4),
    maxScore: typeof attempt.maxScore === 'number' ? attempt.maxScore : (totalQuestions * 4),
    correctCount,
    incorrectCount,
    unattemptedCount,
    avgSecondsPerQuestion: avgSeconds,
    conceptBreakdown,
    strengths,
    conceptMap,
    missedQuestions
  };
}

/**
 * Retrieves historical performance for comparisons and recurring weakness tracking.
 */
export async function getHistory(userId, testId, currentAttemptId) {
  const [previousAttempt, pastPlans] = await Promise.all([
    Attempt.findOne({
      userId,
      testId,
      _id: { $ne: currentAttemptId },
      status: 'submitted'
    }).sort({ submittedAt: -1 }),

    RevisionPlan.find({ userId }).sort({ createdAt: -1 }).limit(10)
  ]);

  const recurringConcepts = {};
  pastPlans.forEach((planDoc) => {
    (planDoc.conceptKeys || []).forEach((key) => {
      recurringConcepts[key] = (recurringConcepts[key] || 0) + 1;
    });
  });

  return {
    previousAttempt: previousAttempt
      ? {
          score: previousAttempt.score,
          accuracy: previousAttempt.accuracy,
          submittedAt: previousAttempt.submittedAt.toISOString()
        }
      : null,
    recurringConcepts
  };
}

/**
 * Generates an AI-powered revision plan with strictly validated schema and vetted/approved resource links.
 */
export async function generateAIPlan(signals, history, catalogCandidates) {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const weakGroups = [];
  signals.conceptMap.forEach((c) => {
    const missed = c.questions.filter((q) => !q.isCorrect);
    if (missed.length > 0) {
      weakGroups.push({
        concept: c.concept,
        conceptKey: c.conceptKey,
        totalInConcept: c.total,
        missedCount: missed.length,
        questions: missed.map((m) => ({
          order: m.order,
          questionText: m.questionText,
          userSelected: m.selectedText,
          correctAnswer: m.correctText,
          explanation: m.explanation,
          signals: m.signals,
          recurringCount: m.recurringCount
        }))
      });
    }
  });

  const catalogSummary = catalogCandidates.map((c) => ({
    id: c.id,
    title: c.title,
    url: c.url,
    type: c.type,
    minutes: c.minutes
  }));

  const isMastery = weakGroups.length === 0;

  const prompt = isMastery
    ? `You are a Principal Computer Science Educator and Diagnostics Mentor analyzing a candidate's exam performance.
The candidate achieved 100% accuracy or made ZERO mistakes on this exam!
Test: "${signals.testTitle}" (Topic: ${signals.topic})
Score: ${signals.score} / ${signals.maxScore} (${signals.accuracy}% Accuracy)
Correct: ${signals.correctCount} | Incorrect: ${signals.incorrectCount} | Unattempted: ${signals.unattemptedCount}

Available Verified Resource Catalog (Advanced & Enrichment Topics):
${JSON.stringify(catalogSummary, null, 2)}

Instructions:
1. Synthesize concise mastery diagnostics:
   - "verdict": 1 clear analytical sentence commending flawless accuracy and strong retention of core domain principles.
   - "performanceLevel": "mastery"
   - "estimatedStudyMinutes": realistic estimate to explore advanced / production-grade topics (e.g. 45-90).
   - "encouragement": 1 uplifting, specific motivational sentence challenging them to tackle complex architectural scenarios or next-level modules.
2. "weakConcepts": Return an empty array [] because no conceptual errors were exhibited.
3. "resources": Pick 2-3 enrichment resources from the catalog (or propose authoritative links ONLY from approved domains: developer.mozilla.org, geeksforgeeks.org, ocw.mit.edu, en.wikipedia.org, visualgo.net, refactoring.guru, postgresql.org) to broaden their knowledge into advanced real-world applications.

Return ONLY valid JSON with this exact schema:
{
  "summary": {
    "verdict": "string",
    "performanceLevel": "mastery",
    "estimatedStudyMinutes": number,
    "encouragement": "string"
  },
  "weakConcepts": [],
  "resources": [
    {
      "id": "string",
      "title": "string",
      "url": "string",
      "type": "article" | "video" | "book" | "practice" | "course" | "documentation",
      "minutes": number,
      "aiSuggested": boolean
    }
  ]
}`
    : `You are a Principal Computer Science Educator and Diagnostics Mentor analyzing a candidate's exam performance.
Test: "${signals.testTitle}" (Topic: ${signals.topic})
Score: ${signals.score} / ${signals.maxScore} (${signals.accuracy}% Accuracy)
Correct: ${signals.correctCount} | Incorrect: ${signals.incorrectCount} | Unattempted: ${signals.unattemptedCount}

Missed Concept Groups:
${JSON.stringify(weakGroups, null, 2)}

Available Verified Resource Catalog:
${JSON.stringify(catalogSummary, null, 2)}

Instructions:
1. Synthesize concise diagnostics:
   - "verdict": 1 clear analytical sentence highlighting key strength vs primary deficiency.
   - "performanceLevel": "mastery" if accuracy >= 80, "intermediate" if >= 50, otherwise "needs_revision".
   - "estimatedStudyMinutes": realistic estimate to master missed concepts (e.g. 60-180).
   - "encouragement": 1 uplifting, specific motivational sentence.
2. For each missed concept group in "weakConcepts":
   - "concept": name of the concept.
   - "conceptKey": normalized slug.
   - "priority": "high" if recurring, fast-wrong, or > 50% missed; "medium" if 1 missed; "low" if minor.
   - "issueType": "misconception" (chose wrong distractor), "knowledge_gap" (unattempted), "careless" (fast-wrong), or "uncertain" (marked_for_review).
   - "questionOrders": array of question orders for this concept.
   - "explanation": 2-3 sentence core computer science principle explanation.
   - "specificMistake": 1-2 sentence description of the exact conceptual trap the candidate fell into.
   - "signals": list of signals provided.
   - "recurringCount": count provided.
   - "resourceIds": pick 1-2 matching IDs from the Available Verified Resource Catalog. If catalog is empty, you may propose 1-2 authoritative links ONLY from approved domains (developer.mozilla.org, geeksforgeeks.org, ocw.mit.edu, en.wikipedia.org, visualgo.net, refactoring.guru, postgresql.org).
3. "resources": list of all referenced resources with id, title, url, type, minutes.

Return ONLY valid JSON with this exact schema:
{
  "summary": {
    "verdict": "string",
    "performanceLevel": "mastery" | "intermediate" | "needs_revision",
    "estimatedStudyMinutes": number,
    "encouragement": "string"
  },
  "weakConcepts": [
    {
      "concept": "string",
      "conceptKey": "string",
      "priority": "high" | "medium" | "low",
      "issueType": "misconception" | "knowledge_gap" | "careless" | "uncertain",
      "questionOrders": [number],
      "explanation": "string",
      "specificMistake": "string",
      "signals": ["string"],
      "recurringCount": number,
      "resourceIds": ["string"]
    }
  ],
  "resources": [
    {
      "id": "string",
      "title": "string",
      "url": "string",
      "type": "article" | "video" | "book" | "practice" | "course" | "documentation",
      "minutes": number,
      "aiSuggested": boolean
    }
  ]
}`;

  const response = await generateGeminiContent({
    prompt,
    config: {
      responseMimeType: 'application/json'
    }
  });

  const parsed = JSON.parse(response.text);

  // Validate resource URLs against approved domain whitelist & sanitize
  const catalogMap = new Map(catalogCandidates.map((c) => [c.id, c]));
  const verifiedResources = [];

  (parsed.resources || []).forEach((r) => {
    if (catalogMap.has(r.id)) {
      const cat = catalogMap.get(r.id);
      verifiedResources.push({
        id: cat.id,
        title: cat.title,
        url: cat.url,
        type: cat.type,
        minutes: cat.minutes,
        aiSuggested: false
      });
    } else if (isApprovedDomain(r.url)) {
      verifiedResources.push({
        id: r.id || `ai-${Math.random().toString(36).slice(2, 8)}`,
        title: r.title,
        url: r.url,
        type: r.type || 'article',
        minutes: typeof r.minutes === 'number' ? r.minutes : 20,
        aiSuggested: true
      });
    }
  });

  // Ensure each weak concept only references valid existing resourceIds
  const validResourceIds = new Set(verifiedResources.map((r) => r.id));
  const sanitizedWeakConcepts = (parsed.weakConcepts || []).map((wc) => ({
    ...wc,
    resourceIds: (wc.resourceIds || []).filter((id) => validResourceIds.has(id))
  }));

  const fullPlan = {
    version: 1,
    source: 'ai',
    generatedAt: new Date().toISOString(),
    summary: parsed.summary,
    stats: {
      correct: signals.correctCount,
      incorrect: signals.incorrectCount,
      unattempted: signals.unattemptedCount,
      accuracy: signals.accuracy,
      score: signals.score,
      maxScore: signals.maxScore,
      avgSecondsPerQuestion: signals.avgSecondsPerQuestion,
      previousAttempt: history.previousAttempt || null
    },
    conceptBreakdown: signals.conceptBreakdown,
    weakConcepts: sanitizedWeakConcepts,
    strengths: signals.strengths,
    resources: verifiedResources
  };

  const validated = revisionPlanSchema.parse(fullPlan);
  return validated;
}

/**
 * Deterministically generates a structured fallback revision plan if AI generation is unavailable.
 */
export function buildFallbackPlan(signals, history, catalogCandidates) {
  const perfLevel =
    signals.accuracy >= 80 ? 'mastery' : signals.accuracy >= 50 ? 'intermediate' : 'needs_revision';

  const verdictMap = {
    mastery: `Excellent mastery demonstrated in ${signals.topic || 'the subject'}, with strong foundational retention.`,
    intermediate: `Solid conceptual grounding in ${signals.topic || 'the subject'}, but targeted revision is required on specific pitfalls.`,
    needs_revision: `Foundational gaps identified across core concepts in ${signals.topic || 'the subject'}. Targeted review is strongly recommended.`
  };

  const weakConcepts = [];
  const resources = [];
  const resourceIdsUsed = new Set();

  signals.conceptMap.forEach((c) => {
    const missed = c.questions.filter((q) => !q.isCorrect);
    if (missed.length > 0) {
      const hasFastWrong = missed.some((m) => m.signals.includes('fast_wrong'));
      const allUnattempted = missed.every((m) => m.status === 'unattempted');
      const isRecurring = missed.some((m) => m.recurringCount > 0);

      const issueType = allUnattempted
        ? 'knowledge_gap'
        : hasFastWrong
        ? 'careless'
        : 'misconception';

      const priority = isRecurring || missed.length >= 2 ? 'high' : 'medium';

      // Pick catalog resource
      const matchedResources = catalogCandidates.filter((r) =>
        r.concepts.some((rc) => c.conceptKey.includes(rc) || rc.includes(c.conceptKey))
      );

      const assignedResourceIds = [];
      const chosenRes = matchedResources[0] || catalogCandidates[0];
      if (chosenRes) {
        assignedResourceIds.push(chosenRes.id);
        if (!resourceIdsUsed.has(chosenRes.id)) {
          resourceIdsUsed.add(chosenRes.id);
          resources.push({
            id: chosenRes.id,
            title: chosenRes.title,
            url: chosenRes.url,
            type: chosenRes.type,
            minutes: chosenRes.minutes,
            aiSuggested: false
          });
        }
      }

      weakConcepts.push({
        concept: c.concept,
        conceptKey: c.conceptKey,
        priority,
        issueType,
        questionOrders: missed.map((m) => m.order),
        explanation: missed[0]?.explanation
          ? missed[0].explanation.slice(0, 300)
          : `Review core theoretical principles and standard problem architectures for ${c.concept}.`,
        specificMistake: allUnattempted
          ? 'You bypassed this question without attempting it.'
          : hasFastWrong
          ? 'Quick selection detected; you may have rushed past critical constraints in the question prompt.'
          : 'Selected distractor option instead of the canonical answer.',
        signals: Array.from(new Set(missed.flatMap((m) => m.signals))),
        recurringCount: Math.max(...missed.map((m) => m.recurringCount || 0), 0),
        resourceIds: assignedResourceIds
      });
    }
  });

  // If no resources were assigned from missed concepts (e.g. 100% mastery), assign 2-3 enrichment resources
  if (resources.length === 0 && catalogCandidates.length > 0) {
    catalogCandidates.slice(0, 3).forEach((cat) => {
      resources.push({
        id: cat.id,
        title: cat.title,
        url: cat.url,
        type: cat.type,
        minutes: cat.minutes,
        aiSuggested: false
      });
    });
  }

  return {
    version: 1,
    source: 'fallback',
    generatedAt: new Date().toISOString(),
    summary: {
      verdict: verdictMap[perfLevel],
      performanceLevel: perfLevel,
      estimatedStudyMinutes: Math.min(180, Math.max(30, weakConcepts.length * 35)),
      encouragement:
        signals.accuracy === 100
          ? 'Flawless performance! Keep up the outstanding momentum and explore advanced engineering patterns.'
          : signals.accuracy >= 75
          ? 'Great progress! Review your weak concepts to hit 100% accuracy.'
          : 'Every error is a roadmap to mastery. Focus on your high-priority concepts first!'
    },
    stats: {
      correct: signals.correctCount,
      incorrect: signals.incorrectCount,
      unattempted: signals.unattemptedCount,
      accuracy: signals.accuracy,
      score: signals.score,
      maxScore: signals.maxScore,
      avgSecondsPerQuestion: signals.avgSecondsPerQuestion,
      previousAttempt: history.previousAttempt || null
    },
    conceptBreakdown: signals.conceptBreakdown,
    weakConcepts,
    strengths: signals.strengths,
    resources
  };
}
