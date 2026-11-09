import Redis from 'ioredis';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';

let redisClient = null;

export const isRedisReady = () => {
  return !!redisClient && redisClient.status === 'ready';
};

export const getRedisConnection = () => {
  if (!redisClient) {
    redisClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (config.nodeEnv === 'test' && times > 1) {
          return null; // Don't hang or spam in tests
        }
        const delay = Math.min(times * 100, 3000);
        return delay;
      }
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis for background job queue');
    });

    redisClient.on('error', (err) => {
      if (config.nodeEnv !== 'test') {
        logger.warn({ err: err.message }, 'Redis connection warning (Background jobs require active Redis)');
      }
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
