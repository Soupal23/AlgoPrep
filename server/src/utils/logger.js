import pino from 'pino';
import { config } from '../config/env.js';

export const logger = pino({
  level: config.nodeEnv === 'development' ? 'debug' : 'info',
  formatters: {
    level: (label) => ({ level: label })
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

export default logger;
