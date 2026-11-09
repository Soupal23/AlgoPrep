import { Worker } from 'bullmq';
import { getRedisConnection } from '../queue/connection.js';
import { generateRoadmap } from '../services/roadmapService.js';
import { failJob } from '../services/jobService.js';
import logger from '../utils/logger.js';

export const createRoadmapWorker = () => {
  const connection = getRedisConnection();

  const worker = new Worker(
    'roadmap',
    async (job) => {
      logger.info({ jobId: job.id, data: job.data }, 'BullMQ Roadmap worker started job');
      return await generateRoadmap(job.data);
    },
    {
      connection,
      concurrency: 2
    }
  );

  worker.on('completed', (job, result) => {
    logger.info({ jobId: job.id, daysCount: result?.days?.length }, 'BullMQ Roadmap job completed');
  });

  worker.on('failed', async (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'BullMQ Roadmap job failed');
    if (job?.data?.jobId) {
      await failJob(job.data.jobId, err).catch(() => {});
    }
  });

  return worker;
};
