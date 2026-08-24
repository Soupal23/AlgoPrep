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
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'algoprep_access_secret_super_secure_key_2026_jwt',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'algoprep_refresh_secret_super_secure_key_2026_jwt',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  adminSeedPassword: process.env.ADMIN_SEED_PASSWORD || '',
  nodeEnv: process.env.NODE_ENV || 'development'
};
