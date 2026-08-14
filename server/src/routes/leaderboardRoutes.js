import { Router } from 'express';
import { getLeaderboard } from '../controllers/leaderboardController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateJWT, getLeaderboard);

export default router;
