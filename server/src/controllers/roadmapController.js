import { Workspace } from '../models/Workspace.js';
import { Roadmap } from '../models/Roadmap.js';
import { Day } from '../models/Day.js';
import { createJob } from '../services/jobService.js';
import { getQueues } from '../queue/queues.js';
import { isRedisReady } from '../queue/connection.js';
import {
  generateRoadmap,
  getRoadmapByWorkspace,
  updateDayStatus
} from '../services/roadmapService.js';
import { getRoadmapChanges } from '../services/masteryService.js';
import logger from '../utils/logger.js';

export const createOrGenerateRoadmap = async (req, res, next) => {
  try {
    const currentUserId = (req.user.userId || req.user._id).toString();
    const { id: workspaceId } = req.params;
    const { days = 7, hoursPerDay = 2, examDate, level = 'intermediate' } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found.'
      });
    }

    if (workspace.ownerId.toString() !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have access to this workspace.'
      });
    }

    // Check regeneration limit if roadmap already exists
    const existing = await Roadmap.findOne({ workspaceId, ownerId: currentUserId });
    if (existing && existing.regenerateCount >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Maximum roadmap regenerations (3) exceeded for this workspace.'
      });
    }

    // 1. Create Job record
    const job = await createJob({
      userId: currentUserId,
      type: 'roadmap',
      refId: workspace._id,
      stage: 'Queued for roadmap generation'
    });

    const jobPayload = {
      workspaceId: workspaceId.toString(),
      userId: currentUserId,
      settings: {
        days: Number(days) || 7,
        hoursPerDay: Number(hoursPerDay) || 2,
        examDate: examDate || workspace.examDate,
        level
      },
      jobId: job._id.toString()
    };

    // 2. Dispatch to queue or direct async fallback
    let queued = false;
    if (isRedisReady()) {
      try {
        const queues = getQueues();
        await queues.roadmap.add('generate-roadmap', jobPayload);
        queued = true;
      } catch (queueErr) {
        logger.warn(
          { err: queueErr.message, workspaceId },
          'Failed to enqueue roadmap to BullMQ, falling back to direct background execution'
        );
      }
    }

    if (!queued) {
      generateRoadmap(jobPayload).catch(err => {
        logger.error({ err: err.message, workspaceId }, 'Direct background roadmap generation failed');
      });
    }

    res.status(202).json({
      success: true,
      message: 'Roadmap generation queued successfully.',
      jobId: job._id
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaceRoadmap = async (req, res, next) => {
  try {
    const currentUserId = (req.user.userId || req.user._id).toString();
    const { id: workspaceId } = req.params;

    const roadmapData = await getRoadmapByWorkspace(workspaceId, currentUserId);
    if (!roadmapData) {
      return res.status(404).json({
        success: false,
        message: 'No study roadmap found for this workspace.'
      });
    }

    res.json({
      success: true,
      roadmap: roadmapData
    });
  } catch (error) {
    next(error);
  }
};

export const regenerateRoadmapController = async (req, res, next) => {
  try {
    const currentUserId = (req.user.userId || req.user._id).toString();
    const { id: roadmapId } = req.params;

    const roadmap = await Roadmap.findById(roadmapId);
    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: 'Roadmap not found.'
      });
    }

    if (roadmap.ownerId.toString() !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to regenerate this roadmap.'
      });
    }

    if (roadmap.regenerateCount >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Maximum roadmap regenerations (3) exceeded for this workspace.'
      });
    }

    const job = await createJob({
      userId: currentUserId,
      type: 'roadmap',
      refId: roadmap.workspaceId,
      stage: 'Queued for roadmap regeneration'
    });

    const jobPayload = {
      workspaceId: roadmap.workspaceId.toString(),
      userId: currentUserId,
      settings: req.body?.settings || roadmap.settings,
      jobId: job._id.toString()
    };

    let queued = false;
    if (isRedisReady()) {
      try {
        const queues = getQueues();
        await queues.roadmap.add('generate-roadmap', jobPayload);
        queued = true;
      } catch (queueErr) {
        logger.warn({ err: queueErr.message }, 'Queue unavailable for regeneration');
      }
    }

    if (!queued) {
      generateRoadmap(jobPayload).catch(err => {
        logger.error({ err: err.message }, 'Direct regeneration failed');
      });
    }

    res.status(202).json({
      success: true,
      message: 'Roadmap regeneration queued successfully.',
      jobId: job._id
    });
  } catch (error) {
    next(error);
  }
};

export const reorderDays = async (req, res, next) => {
  try {
    const currentUserId = (req.user.userId || req.user._id).toString();
    const { id: roadmapId } = req.params;
    const { dayIds } = req.body;

    if (!Array.isArray(dayIds) || dayIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Array of dayIds is required.'
      });
    }

    const roadmap = await Roadmap.findById(roadmapId);
    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: 'Roadmap not found.'
      });
    }

    if (roadmap.ownerId.toString() !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to modify this roadmap.'
      });
    }

    // Apply new sequential dayNumbers
    const updatePromises = dayIds.map((dayId, index) =>
      Day.findOneAndUpdate(
        { _id: dayId, roadmapId },
        { dayNumber: index + 1 }
      )
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Days reordered successfully.'
    });
  } catch (error) {
    next(error);
  }
};

export const getDayById = async (req, res, next) => {
  try {
    const currentUserId = (req.user.userId || req.user._id).toString();
    const { dayId } = req.params;

    const day = await Day.findById(dayId).lean();
    if (!day) {
      return res.status(404).json({
        success: false,
        message: 'Day not found.'
      });
    }

    if (day.ownerId.toString() !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have access to this day.'
      });
    }

    res.json({
      success: true,
      day
    });
  } catch (error) {
    next(error);
  }
};

export const updateDayStatusController = async (req, res, next) => {
  try {
    const currentUserId = (req.user.userId || req.user._id).toString();
    const { dayId } = req.params;
    const { status } = req.body;

    if (!['locked', 'available', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value.'
      });
    }

    const updatedDay = await updateDayStatus(dayId, currentUserId, status);

    res.json({
      success: true,
      message: 'Day status updated successfully.',
      day: updatedDay
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/roadmaps/:id/changes
 * Retrieves re-planning version change history for a roadmap.
 */
export const getRoadmapChangesController = async (req, res, next) => {
  try {
    const currentUserId = (req.user.userId || req.user._id).toString();
    const { id: roadmapId } = req.params;

    const result = await getRoadmapChanges(roadmapId, currentUserId);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};
