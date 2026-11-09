import { Queue } from 'bullmq';
import { getRedisConnection } from './connection.js';

let queues = null;

export const getQueues = () => {
  if (!queues) {
    const connection = getRedisConnection();
    const defaultJobOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 }
    };

    queues = {
      ingest: new Queue('ingest', { connection, defaultJobOptions }),
      roadmap: new Queue('roadmap', { connection, defaultJobOptions }),
      content: new Queue('content', { connection, defaultJobOptions }),
      resources: new Queue('resources', { connection, defaultJobOptions }),
      analysis: new Queue('analysis', { connection, defaultJobOptions })
    };
  }

  return queues;
};
