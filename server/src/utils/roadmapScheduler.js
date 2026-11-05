import logger from './logger.js';

/**
 * Topologically sorts topics by their prerequisites using Kahn's algorithm.
 * Automatically detects and safely breaks dependency cycles so no topic is ever lost.
 *
 * @param {Array<{ key: string, prerequisites?: string[] }>} topics
 * @returns {Array<Object>} Sorted topics in pedagogical order
 */
export function topologicalSortTopics(topics) {
  if (!Array.isArray(topics) || topics.length <= 1) {
    return topics || [];
  }

  const topicMap = new Map();
  const inDegree = new Map();
  const adjList = new Map(); // prereq -> [dependent topics]

  // Initialize data structures
  for (const topic of topics) {
    topicMap.set(topic.key, topic);
    inDegree.set(topic.key, 0);
    adjList.set(topic.key, []);
  }

  // Populate graph edges (validating prerequisites exist in the topic list)
  for (const topic of topics) {
    const prereqs = Array.isArray(topic.prerequisites) ? topic.prerequisites : [];
    for (const prereqKey of prereqs) {
      if (topicMap.has(prereqKey) && prereqKey !== topic.key) {
        adjList.get(prereqKey).push(topic.key);
        inDegree.set(topic.key, inDegree.get(topic.key) + 1);
      }
    }
  }

  // Queue of nodes with no incoming dependencies (in-degree 0)
  const queue = [];
  for (const [key, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(key);
    }
  }

  const sorted = [];

  while (queue.length > 0) {
    const currKey = queue.shift();
    sorted.push(topicMap.get(currKey));

    for (const neighborKey of adjList.get(currKey)) {
      const newDeg = inDegree.get(neighborKey) - 1;
      inDegree.set(neighborKey, newDeg);
      if (newDeg === 0) {
        queue.push(neighborKey);
      }
    }
  }

  // Cycle recovery: if any nodes remain unprocessed due to circular dependencies
  if (sorted.length < topics.length) {
    logger.warn(
      { sortedCount: sorted.length, totalCount: topics.length },
      'Dependency cycle detected in topics. Breaking cycle to preserve all topics.'
    );

    const sortedKeys = new Set(sorted.map(t => t.key));
    for (const topic of topics) {
      if (!sortedKeys.has(topic.key)) {
        sorted.push(topic);
      }
    }
  }

  return sorted;
}

/**
 * Deterministically partitions topics into a structured day-by-day learning schedule.
 *
 * @param {Object} params
 * @param {Array<Object>} params.topics - Topologically sorted topics
 * @param {number} params.totalDays - Total days in the roadmap (e.g. 7)
 * @param {number} params.hoursPerDay - Daily time commitment in hours (e.g. 2)
 * @returns {Array<Object>} Structured day objects ready for DB persistence
 */
export function scheduleDays({ topics = [], totalDays = 7, hoursPerDay = 2 }) {
  const daysCount = Math.max(Number(totalDays) || 7, 1);
  const dailyTargetMins = Math.max((Number(hoursPerDay) || 2) * 60, 30);

  // 1. Determine day types
  const dayPlan = [];
  let learnDaysCount = daysCount;
  let hasRevision = false;
  let hasMock = false;

  if (daysCount >= 5) {
    hasMock = true;
    hasRevision = true;
    learnDaysCount = daysCount - 2;
  } else if (daysCount >= 3) {
    hasMock = true;
    learnDaysCount = daysCount - 1;
  } else if (daysCount === 2) {
    hasMock = true;
    learnDaysCount = 1;
  } else {
    // 1-day sprint: learn & test combined
    learnDaysCount = 1;
  }

  // 2. Partition topics across the learn days
  const learnDayTopics = Array.from({ length: learnDaysCount }, () => []);

  if (topics.length > 0) {
    if (topics.length <= learnDaysCount) {
      // Few topics: allocate one per learn day sequentially
      topics.forEach((topic, idx) => {
        learnDayTopics[idx].push(topic);
      });
    } else {
      // Multiple topics: bin pack keeping chronological order
      let currentDayIdx = 0;
      let currentDayMinutes = 0;

      for (let i = 0; i < topics.length; i++) {
        const topic = topics[i];
        const est = topic.estMinutes || 60;
        const remainingTopics = topics.length - i;
        const remainingDays = learnDaysCount - currentDayIdx;

        // If current day has topics and adding this one exceeds budget,
        // and we still have enough days left for remaining topics, advance day
        if (
          currentDayMinutes + est > dailyTargetMins &&
          learnDayTopics[currentDayIdx].length > 0 &&
          remainingDays > 1 &&
          remainingTopics >= remainingDays
        ) {
          currentDayIdx++;
          currentDayMinutes = 0;
        }

        learnDayTopics[currentDayIdx].push(topic);
        currentDayMinutes += est;
      }
    }
  }

  // 3. Assemble learn days
  for (let i = 0; i < learnDaysCount; i++) {
    const dayNum = i + 1;
    const dayTopics = learnDayTopics[i] || [];
    const topicKeys = dayTopics.map(t => t.key);
    const dayMins = dayTopics.reduce((sum, t) => sum + (t.estMinutes || 60), 0) || dailyTargetMins;

    const title = dayTopics.length > 0
      ? (dayTopics.length === 1 ? dayTopics[0].title : `${dayTopics[0].title} & Core Concepts`)
      : `Day ${dayNum}: Foundation & Core Study`;

    const objectives = dayTopics.length > 0
      ? dayTopics.map(t => `Master ${t.title}: ${t.description || 'key theoretical and practical concepts'}`)
      : ['Review fundamental concepts and study material documentation'];

    dayPlan.push({
      dayNumber: dayNum,
      title,
      objectives,
      topicKeys,
      estMinutes: dayMins,
      type: 'learn',
      status: dayNum === 1 ? 'available' : 'locked',
      content: {
        notesStatus: 'pending',
        resourcesStatus: 'pending',
        testStatus: 'pending'
      }
    });
  }

  // 4. Assemble revision day if applicable
  if (hasRevision) {
    const dayNum = dayPlan.length + 1;
    dayPlan.push({
      dayNumber: dayNum,
      title: 'Synthesis, Formula Review & Weak Area Revision',
      objectives: [
        'Review summary notes and active recall flashcards from preceding days',
        'Re-attempt problematic questions and resolve conceptual ambiguities',
        'Consolidate key formulas, theorems, and architectural patterns'
      ],
      topicKeys: topics.slice(-3).map(t => t.key),
      estMinutes: dailyTargetMins,
      type: 'revision',
      status: 'locked',
      content: {
        notesStatus: 'pending',
        resourcesStatus: 'pending',
        testStatus: 'pending'
      }
    });
  }

  // 5. Assemble mock exam day if applicable
  if (hasMock) {
    const dayNum = dayPlan.length + 1;
    dayPlan.push({
      dayNumber: dayNum,
      title: 'Comprehensive CBT Mock Exam & Readiness Assessment',
      objectives: [
        'Complete timed full-length CBT mock examination under exam conditions',
        'Analyze question-level accuracy, speed, and negative marking impact',
        'Review AI remediation plan and personalized next steps'
      ],
      topicKeys: [],
      estMinutes: dailyTargetMins,
      type: 'mock',
      status: 'locked',
      content: {
        notesStatus: 'pending',
        resourcesStatus: 'pending',
        testStatus: 'pending'
      }
    });
  }

  return dayPlan;
}
