import { Day } from '../models/Day.js';
import { Notes } from '../models/Notes.js';
import { generateDayNotes, getNotesByDayId, markNotesAsRead } from '../services/notesService.js';
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
