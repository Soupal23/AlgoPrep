import Redis from 'ioredis';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';

let redisClient = null;

export const getRedisConnection = () => {
  if (!redisClient) {
    redisClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        return delay;
      }
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis for background job queue');
    });

    redisClient.on('error', (err) => {
      logger.warn({ err: err.message }, 'Redis connection warning (Background jobs require active Redis)');
    });
  }

  return redisClient;
};

export const closeRedisConnection = async () => {
  if (redisClient) {
    await redisClient.quit().catch(() => {});
    redisClient = null;
  }
};
