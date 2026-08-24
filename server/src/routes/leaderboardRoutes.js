import { Router } from 'express';
import { getLeaderboard } from '../controllers/leaderboardController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateJWT, requireRole('student', 'teacher', 'admin'), getLeaderboard);

export default router;
