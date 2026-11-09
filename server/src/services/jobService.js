import EventEmitter from 'events';
import { Job } from '../models/Job.js';
import logger from '../utils/logger.js';

class JobEventEmitter extends EventEmitter {}
export const jobEvents = new JobEventEmitter();

// Max listeners for active concurrent SSE subscribers
jobEvents.setMaxListeners(200);

export const createJob = async ({ userId, type, refId = null, stage = 'Queued' }) => {
  const job = await Job.create({
    userId,
    type,
    refId,
    status: 'queued',
    progress: 0,
    stage,
    startedAt: new Date()
  });

  return job;
};

export const updateJobProgress = async (jobId, { progress, stage }) => {
  const updateData = {
    status: 'running',
    ...(typeof progress === 'number' ? { progress: Math.min(100, Math.max(0, progress)) } : {}),
    ...(stage ? { stage } : {})
  };

  const job = await Job.findByIdAndUpdate(jobId, updateData, { new: true });
  if (job) {
    jobEvents.emit(`job:${jobId}`, {
      jobId: job._id.toString(),
      status: job.status,
      progress: job.progress,
      stage: job.stage
    });
  }

  return job;
};

export const completeJob = async (jobId, result = null) => {
  const job = await Job.findByIdAndUpdate(
    jobId,
    {
      status: 'completed',
      progress: 100,
      stage: 'Completed',
      result,
      completedAt: new Date()
    },
    { new: true }
  );

  if (job) {
    jobEvents.emit(`job:${jobId}`, {
      jobId: job._id.toString(),
      status: job.status,
      progress: 100,
      stage: 'Completed',
      result
    });
  }

  return job;
};

export const failJob = async (jobId, err) => {
  const errorMessage = err?.message || String(err) || 'Job processing failed';
  logger.error({ jobId, err: errorMessage }, 'Job failed');

  const job = await Job.findByIdAndUpdate(
    jobId,
    {
      status: 'failed',
      stage: 'Failed',
      error: errorMessage,
      completedAt: new Date()
    },
    { new: true }
  );

  if (job) {
    jobEvents.emit(`job:${jobId}`, {
      jobId: job._id.toString(),
      status: job.status,
      progress: job.progress,
      stage: 'Failed',
      error: errorMessage
    });
  }

  return job;
};

export const getJobById = async (jobId, userId = null) => {
  const query = { _id: jobId };
  if (userId) {
    query.userId = userId;
  }
  return Job.findOne(query);
};
