import { Worker } from 'bullmq';
import { getRedisConnection } from './connection.js';
import { updateJobProgress, completeJob, failJob } from '../services/jobService.js';
import { createIngestionWorker } from '../workers/ingestionWorker.js';
import { createRoadmapWorker } from '../workers/roadmapWorker.js';
import { createDayContentWorker } from '../workers/dayContentWorker.js';
import logger from '../utils/logger.js';

let workers = [];

export const startWorkers = () => {
  const connection = getRedisConnection();

  // Test / Placeholder worker for Phase 2 validation
  const testWorker = new Worker(
    'testQueue',
    async (job) => {
      const { jobId, steps = 3 } = job.data;
      logger.info({ jobId }, 'Starting test job execution');

      for (let i = 1; i <= steps; i++) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        await updateJobProgress(jobId, {
          progress: Math.round((i / steps) * 100),
          stage: `Processing step ${i} of ${steps}`
        });
      }

      await completeJob(jobId, { message: 'Test background job finished successfully' });
      return { success: true };
    },
    { connection, concurrency: 2 }
  );

  testWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'BullMQ test worker finished job');
  });

  testWorker.on('failed', async (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'BullMQ test worker job failed');
    if (job?.data?.jobId) {
      await failJob(job.data.jobId, err);
    }
  });

  workers.push(testWorker);

  // Ingestion Worker
  try {
    const ingestWorker = createIngestionWorker();
    workers.push(ingestWorker);
  } catch (err) {
    logger.warn({ err: err.message }, 'Could not initialize Ingestion Worker');
  }

  // Roadmap Worker
  try {
    const roadmapWorker = createRoadmapWorker();
    workers.push(roadmapWorker);
  } catch (err) {
    logger.warn({ err: err.message }, 'Could not initialize Roadmap Worker');
  }

  // Day Content (Notes) Worker
  try {
    const dayContentWorker = createDayContentWorker();
    workers.push(dayContentWorker);
  } catch (err) {
    logger.warn({ err: err.message }, 'Could not initialize Day Content Worker');
  }

  logger.info('Background job workers initialized');
};

export const stopWorkers = async () => {
  for (const worker of workers) {
    await worker.close().catch(() => {});
  }
  workers = [];
};
