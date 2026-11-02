import { Worker } from 'bullmq';
import { getRedisConnection } from '../queue/connection.js';
import { ingestMaterial } from '../services/ingestionService.js';
import { failJob } from '../services/jobService.js';
import logger from '../utils/logger.js';

export const createIngestionWorker = () => {
  const connection = getRedisConnection();

  const worker = new Worker(
    'ingest',
    async (job) => {
      logger.info({ jobId: job.id, data: job.data }, 'BullMQ Ingestion worker started job');
      return await ingestMaterial(job.data);
    },
    {
      connection,
      concurrency: 3
    }
  );

  worker.on('completed', (job, result) => {
    logger.info({ jobId: job.id, chunkCount: result?.chunkCount }, 'BullMQ Ingestion job completed');
  });

  worker.on('failed', async (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'BullMQ Ingestion job failed');
    if (job?.data?.jobId) {
      await failJob(job.data.jobId, err).catch(() => {});
    }
  });

  return worker;
};
