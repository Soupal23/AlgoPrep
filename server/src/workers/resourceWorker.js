import { Worker } from 'bullmq';
import { getRedisConnection } from '../queue/connection.js';
import { getOrCurateDayResources } from '../services/resourceService.js';
import { failJob } from '../services/jobService.js';
import logger from '../utils/logger.js';

export const createResourceWorker = () => {
  const connection = getRedisConnection();

  const worker = new Worker(
    'resources',
    async (job) => {
      logger.info({ jobId: job.id, data: job.data }, 'BullMQ Resource worker started job');
      return await getOrCurateDayResources(job.data);
    },
    {
      connection,
      concurrency: 2
    }
  );

  worker.on('completed', (job, result) => {
    logger.info({ jobId: job.id, count: result?.length || 0 }, 'BullMQ Resource job completed');
  });

  worker.on('failed', async (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'BullMQ Resource job failed');
    if (job?.data?.jobId) {
      await failJob(job.data.jobId, err).catch(() => {});
    }
  });

  return worker;
};
