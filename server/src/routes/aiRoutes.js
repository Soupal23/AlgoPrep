import { Router } from 'express';
import { generateAITestController } from '../controllers/aiController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { rateLimiterByUser } from '../middleware/rateLimiter.js';
import { uploadSyllabus } from '../middleware/upload.js';

const router = Router();

// Rate limited by authenticated user ID (5 requests per hour)
router.post('/generate', authenticateJWT, rateLimiterByUser(5, 3600000), uploadSyllabus.single('file'), generateAITestController);

export default router;
