import { Roadmap } from '../models/Roadmap.js';
import { Day } from '../models/Day.js';
import logger from '../utils/logger.js';

/**
 * Deterministically adjusts the roadmap schedule based on weak concept signals.
 * Inserts revision topics into future days or revision buffers, and records versioned change logs.
 */
export async function replanRoadmapForWeakConcepts({ roadmapId, userId, weakConcepts = [] }) {
  if (!roadmapId || !Array.isArray(weakConcepts) || weakConcepts.length === 0) {
    return { replanned: false };
  }

  const roadmap = await Roadmap.findById(roadmapId);
  if (!roadmap) {
    return { replanned: false, error: 'Roadmap not found' };
  }

  if (roadmap.ownerId.toString() !== userId.toString()) {
    return { replanned: false, error: 'Forbidden' };
  }

  const days = await Day.find({ roadmapId }).sort({ dayNumber: 1 });
  if (days.length === 0) {
    return { replanned: false };
  }

  // Find future or available days that are not completed
  const availableDays = days.filter((d) => d.status !== 'completed');
  if (availableDays.length === 0) {
    logger.info({ roadmapId }, 'All days completed; no available days for dynamic revision re-planning');
    return { replanned: false };
  }

  let modificationsCount = 0;

  for (const weak of weakConcepts) {
    const key = weak.conceptKey;
    if (!key) continue;

    // Target Selection:
    // 1. Revision buffer day that does not already include this concept
    let targetDay = availableDays.find(
      (d) => d.type === 'revision' && !(d.topicKeys || []).includes(key)
    );

    // 2. An upcoming learn day with spare time capacity that doesn't already have this concept
    if (!targetDay) {
      targetDay = availableDays.find(
        (d) => d.type === 'learn' && !(d.topicKeys || []).includes(key) && (d.topicKeys?.length || 0) < 4 && (d.estMinutes || 60) <= 120
      );
    }

    // 3. Fallback to another non-mock day that doesn't already have it
    if (!targetDay) {
      targetDay = availableDays.find(
        (d) => d.type !== 'mock' && !(d.topicKeys || []).includes(key)
      );
    }

    if (!targetDay) {
      // Concept is already scheduled in upcoming revision or target days
      continue;
    }

    targetDay.topicKeys = targetDay.topicKeys || [];
    targetDay.topicKeys.push(key);
    targetDay.estMinutes = Math.min(180, (targetDay.estMinutes || 60) + 30);

      // Reset testStatus so fresh revision questions are curated for that day
      if (targetDay.content) {
        targetDay.content.testStatus = 'pending';
      }
      await targetDay.save();

      // Log the modification in the roadmap's change log
      roadmap.version = (roadmap.version || 1) + 1;
      roadmap.changeLog = roadmap.changeLog || [];
      roadmap.changeLog.push({
        version: roadmap.version,
        change: `Added revision for "${weak.conceptTitle || key}" to Day ${targetDay.dayNumber} (${targetDay.title})`,
        reason: `Concept mastery at ${Math.round((weak.mastery || 0) * 100)}% (below 60% threshold)`,
        at: new Date()
      });

      modificationsCount++;
  }

  if (modificationsCount > 0) {
    await roadmap.save();
    logger.info(
      { roadmapId, modificationsCount, newVersion: roadmap.version },
      'Dynamic roadmap re-planning completed'
    );
    return {
      replanned: true,
      version: roadmap.version,
      changeLog: roadmap.changeLog
    };
  }

  return { replanned: false, version: roadmap.version, changeLog: roadmap.changeLog };
}
