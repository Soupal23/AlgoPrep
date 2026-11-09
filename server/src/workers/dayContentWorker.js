import { Worker } from 'bullmq';
import { getRedisConnection } from '../queue/connection.js';
import { generateDayNotes } from '../services/notesService.js';
import { failJob } from '../services/jobService.js';
import logger from '../utils/logger.js';

export const createDayContentWorker = () => {
  const connection = getRedisConnection();

  const worker = new Worker(
    'content',
    async (job) => {
      logger.info({ jobId: job.id, data: job.data }, 'BullMQ Day Content worker started job');
      return await generateDayNotes(job.data);
    },
    {
      connection,
      concurrency: 2
    }
  );

  worker.on('completed', (job, result) => {
    logger.info({ jobId: job.id, notesId: result?._id }, 'BullMQ Day Content job completed');
  });

  worker.on('failed', async (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'BullMQ Day Content job failed');
    if (job?.data?.jobId) {
      await failJob(job.data.jobId, err).catch(() => {});
    }
  });

  return worker;
};
