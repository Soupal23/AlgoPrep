import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/algoprep',
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'algoprep_access_secret_super_secure_key_2026_jwt',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'algoprep_refresh_secret_super_secure_key_2026_jwt',

  // Gemini AI Models
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModelFast: process.env.GEMINI_MODEL_FAST || 'gemini-3.5-flash-lite',
  geminiModelDefault: process.env.GEMINI_MODEL_DEFAULT || 'gemini-3.5-flash',
  geminiModelReasoning: process.env.GEMINI_MODEL_REASONING || 'gemini-3.5-flash',
  geminiEmbedModel: process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001',
  embedDimensions: parseInt(process.env.EMBED_DIMENSIONS || '768', 10),

  // Observability & Curation
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
  tavilyApiKey: process.env.TAVILY_API_KEY || '',
  langfusePublicKey: process.env.LANGFUSE_PUBLIC_KEY || '',
  langfuseSecretKey: process.env.LANGFUSE_SECRET_KEY || '',
  langfuseHost: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',

  adminSeedPassword: process.env.ADMIN_SEED_PASSWORD || '',
  adminSeedEmail: process.env.ADMIN_SEED_EMAIL || 'admin@algoprep.com',
  nodeEnv: process.env.NODE_ENV || 'development',
  runWorkers: process.env.RUN_WORKERS !== 'false',

  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || ''
};

// Fail fast in production if security secrets use insecure defaults
if (config.nodeEnv === 'production') {
  if (
    !process.env.JWT_ACCESS_SECRET ||
    config.jwtAccessSecret === 'algoprep_access_secret_super_secure_key_2026_jwt' ||
    config.jwtAccessSecret.length < 32
  ) {
    throw new Error('FATAL SECURITY ERROR: JWT_ACCESS_SECRET must be explicitly set to a strong secret (>=32 chars) in production.');
  }
  if (
    !process.env.JWT_REFRESH_SECRET ||
    config.jwtRefreshSecret === 'algoprep_refresh_secret_super_secure_key_2026_jwt' ||
    config.jwtRefreshSecret.length < 32
  ) {
    throw new Error('FATAL SECURITY ERROR: JWT_REFRESH_SECRET must be explicitly set to a strong secret (>=32 chars) in production.');
  }
}
