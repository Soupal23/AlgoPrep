import { Day } from '../models/Day.js';
import { Notes } from '../models/Notes.js';
import { Job } from '../models/Job.js';
import { DayResource } from '../models/DayResource.js';
import { generateDayNotes, getNotesByDayId, markNotesAsRead } from '../services/notesService.js';
import { getDayResources, getOrCurateDayResources, saveResourceFeedback } from '../services/resourceService.js';
import { createJob } from '../services/jobService.js';
import { getQueues } from '../queue/queues.js';
import { isRedisReady } from '../queue/connection.js';
import logger from '../utils/logger.js';

/**
 * GET /api/days/:dayId/notes
 * Retrieves existing study notes, or queues/runs generation on first request.
 */
export const getDayNotesController = async (req, res, next) => {
  try {
    const currentUserId = (req.user.userId || req.user._id).toString();
    const { dayId } = req.params;
    const isSync = req.query.sync === 'true';

    const day = await Day.findById(dayId);
    if (!day) {
      return res.status(404).json({
        success: false,
        message: 'Day not found.'
      });
    }

    if (day.ownerId.toString() !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not own this day.'
      });
    }

    // 1. Check if ready notes already exist
    const existingNotes = await Notes.findOne({ dayId }).lean();
    if (existingNotes && existingNotes.status === 'ready') {
      return res.json({
        success: true,
        status: 'ready',
        notes: existingNotes
      });
    }

    // 2. If sync generation requested (e.g. testing or quick generation), generate immediately
    if (isSync) {
      const notes = await generateDayNotes({
        dayId,
        userId: currentUserId,
        force: false
      });
      return res.json({
        success: true,
        status: 'ready',
        notes
      });
    }

    // 3. Otherwise, create a tracking Job and dispatch generation
    const job = await createJob({
      userId: currentUserId,
      type: 'day_content',
      refId: dayId,
      stage: 'Initiating note generation'
    });

    const jobPayload = {
      dayId,
      userId: currentUserId,
      jobId: job._id.toString(),
      force: false
    };

    // Dispatch via BullMQ if Redis available, otherwise in background
    let queuedToBullMQ = false;
    if (isRedisReady()) {
      try {
        const queues = getQueues();
        if (queues?.content) {
          await queues.content.add('generateDayNotes', jobPayload, {
            jobId: job._id.toString()
          });
          queuedToBullMQ = true;
        }
      } catch (queueErr) {
        logger.warn({ err: queueErr.message }, 'Could not add notes job to BullMQ, falling back to background execution');
      }
    }

    if (!queuedToBullMQ) {
      setImmediate(async () => {
        try {
          await generateDayNotes(jobPayload);
        } catch (err) {
          logger.error({ err: err.message, dayId }, 'Background notes generation failed');
        }
      });
    }

    return res.status(202).json({
      success: true,
      status: 'generating',
      jobId: job._id.toString(),
      message: 'Study notes are being generated from your course materials.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/days/:dayId/notes/regenerate
 * Forces a fresh re-generation of grounded notes for the day.
 */
export const regenerateDayNotesController = async (req, res, next) => {
  try {
    const currentUserId = (req.user.userId || req.user._id).toString();
    const { dayId } = req.params;
    const isSync = req.query.sync === 'true';

    const day = await Day.findById(dayId);
    if (!day) {
      return res.status(404).json({
        success: false,
        message: 'Day not found.'
      });
    }

    if (day.ownerId.toString() !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not own this day.'
      });
    }

    if (isSync) {
      const notes = await generateDayNotes({
        dayId,
        userId: currentUserId,
        force: true
      });
      return res.json({
        success: true,
        status: 'ready',
        notes
      });
    }

    const job = await createJob({
      userId: currentUserId,
      type: 'day_content',
      refId: dayId,
      stage: 'Initiating note regeneration'
    });

    const jobPayload = {
      dayId,
      userId: currentUserId,
      jobId: job._id.toString(),
      force: true
    };

    let queuedToBullMQ = false;
    if (isRedisReady()) {
      try {
        const queues = getQueues();
        if (queues?.content) {
          await queues.content.add('generateDayNotes', jobPayload, {
            jobId: job._id.toString()
          });
          queuedToBullMQ = true;
        }
      } catch (queueErr) {
        logger.warn({ err: queueErr.message }, 'Could not add notes job to BullMQ, falling back to background execution');
      }
    }

    if (!queuedToBullMQ) {
      setImmediate(async () => {
        try {
          await generateDayNotes(jobPayload);
        } catch (err) {
          logger.error({ err: err.message, dayId }, 'Background notes regeneration failed');
        }
      });
    }

    return res.status(202).json({
      success: true,
      status: 'generating',
      jobId: job._id.toString(),
      message: 'Regenerating fresh study notes and active recall flashcards.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/days/:dayId/notes/read
 * Marks notes as read and transitions available day to in_progress.
 */
export const markNotesReadController = async (req, res, next) => {
  try {
    const currentUserId = (req.user.userId || req.user._id).toString();
    const { dayId } = req.params;

    const result = await markNotesAsRead(dayId, currentUserId);
    res.json({
      success: true,
      message: 'Notes marked as read.',
      readStatus: result.notes.readStatus,
      dayStatus: result.day?.status
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/days/:dayId/resources
 * Retrieves existing curated resources for a day, or dispatches curation if pending.
 */
export const getDayResourcesController = async (req, res, next) => {
  try {
    const currentUserId = (req.user.userId || req.user._id).toString();
    const { dayId } = req.params;
    const isSync = req.query.sync === 'true';

    const day = await Day.findById(dayId);
    if (!day) {
      return res.status(404).json({
        success: false,
        message: 'Day not found.'
      });
    }

    if (day.ownerId.toString() !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not own this day.'
      });
    }

    // 1. If resources are already ready, return them immediately
    if (day.content?.resourcesStatus === 'ready') {
      const data = await getDayResources(dayId, currentUserId);
      if (data.resources && data.resources.length > 0) {
        return res.json({
          success: true,
          status: 'ready',
          resources: data.resources
        });
      }
    }

    // 2. Synchronous mode (testing/direct)
    if (isSync) {
      const resources = await getOrCurateDayResources({
        dayId,
        userId: currentUserId,
        force: false
      });
      return res.json({
        success: true,
        status: 'ready',
        resources
      });
    }

    // 3. Check for existing active job
    const existingJob = await Job.findOne({
      refId: dayId,
      type: 'resources',
      status: { $in: ['queued', 'running'] }
    }).sort({ createdAt: -1 });

    if (existingJob) {
      return res.status(202).json({
        success: true,
        status: 'generating',
        jobId: existingJob._id.toString(),
        message: 'Educational resources are being curated in the background.'
      });
    }

    // 4. Create and dispatch background curation job
    const job = await createJob({
      userId: currentUserId,
      type: 'resources',
      refId: dayId,
      stage: 'Curating multi-source educational resources'
    });

    const jobPayload = {
      dayId,
      userId: currentUserId,
      jobId: job._id.toString(),
      force: false
    };

    let queuedToBullMQ = false;
    if (isRedisReady()) {
      try {
        const queues = getQueues();
        if (queues?.resources) {
          await queues.resources.add('curateDayResources', jobPayload, {
            jobId: job._id.toString()
          });
          queuedToBullMQ = true;
        }
      } catch (queueErr) {
        logger.warn({ err: queueErr.message }, 'Could not add resources job to BullMQ, falling back to background execution');
      }
    }

    if (!queuedToBullMQ) {
      setImmediate(async () => {
        try {
          await getOrCurateDayResources(jobPayload);
        } catch (err) {
          logger.error({ err: err.message, dayId }, 'Background resource curation failed');
        }
      });
    }

    return res.status(202).json({
      success: true,
      status: 'generating',
      jobId: job._id.toString(),
      message: 'Educational resources are being curated from verified sources.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/days/:dayId/resources/regenerate
 * Forces a fresh re-curation of resources across all adapters.
 */
export const regenerateDayResourcesController = async (req, res, next) => {
  try {
    const currentUserId = (req.user.userId || req.user._id).toString();
    const { dayId } = req.params;
    const isSync = req.query.sync === 'true';

    const day = await Day.findById(dayId);
    if (!day) {
      return res.status(404).json({
        success: false,
        message: 'Day not found.'
      });
    }

    if (day.ownerId.toString() !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not own this day.'
      });
    }

    if (isSync) {
      const resources = await getOrCurateDayResources({
        dayId,
        userId: currentUserId,
        force: true
      });
      return res.json({
        success: true,
        status: 'ready',
        resources
      });
    }

    const job = await createJob({
      userId: currentUserId,
      type: 'resources',
      refId: dayId,
      stage: 'Initiating resource re-curation'
    });

    const jobPayload = {
      dayId,
      userId: currentUserId,
      jobId: job._id.toString(),
      force: true
    };

    let queuedToBullMQ = false;
    if (isRedisReady()) {
      try {
        const queues = getQueues();
        if (queues?.resources) {
          await queues.resources.add('curateDayResources', jobPayload, {
            jobId: job._id.toString()
          });
          queuedToBullMQ = true;
        }
      } catch (queueErr) {
        logger.warn({ err: queueErr.message }, 'Could not add resources job to BullMQ');
      }
    }

    if (!queuedToBullMQ) {
      setImmediate(async () => {
        try {
          await getOrCurateDayResources(jobPayload);
        } catch (err) {
          logger.error({ err: err.message, dayId }, 'Background resource regeneration failed');
        }
      });
    }

    return res.status(202).json({
      success: true,
      status: 'generating',
      jobId: job._id.toString(),
      message: 'Regenerating fresh educational resources.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/resources/:id/feedback
 * Records user feedback (helpful thumbs up/down, watched) on a day resource.
 */
export const saveResourceFeedbackController = async (req, res, next) => {
  try {
    const currentUserId = (req.user.userId || req.user._id).toString();
    const { id } = req.params;
    const { helpful, watched } = req.body;

    let dayResource = await DayResource.findById(id);
    if (!dayResource) {
      dayResource = await DayResource.findOne({ resourceId: id, ownerId: currentUserId });
    }

    if (!dayResource) {
      return res.status(404).json({
        success: false,
        message: 'Day resource not found'
      });
    }

    if (dayResource.ownerId.toString() !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot modify this resource feedback'
      });
    }

    const updated = await saveResourceFeedback({
      dayResourceId: dayResource._id,
      userId: currentUserId,
      helpful,
      watched
    });

    return res.json({
      success: true,
      message: 'Feedback saved successfully',
      dayResource: updated
    });
  } catch (error) {
    next(error);
  }
};
