import { Router } from 'express';
import {
  saveProgress,
  submitAttempt,
  getAttemptById,
  getUserAttempts,
  getAttemptReview,
  getAIRevisionPlan,
  regenerateAIRevisionPlan
} from '../controllers/attemptController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { attemptSaveLimiter, attemptSubmitLimiter, revisionRegenerateLimiter } from '../middleware/rateLimits.js';

const router = Router();

router.get('/user/my-attempts', authenticateJWT, requireRole('student'), getUserAttempts);
router.get('/:id', authenticateJWT, requireRole('student', 'admin'), getAttemptById);
router.get('/:id/review', authenticateJWT, requireRole('student'), getAttemptReview);
router.get('/:id/ai-revision', authenticateJWT, requireRole('student'), getAIRevisionPlan);
router.post('/:id/ai-revision/regenerate', authenticateJWT, requireRole('student'), revisionRegenerateLimiter, regenerateAIRevisionPlan);
router.patch('/:id/progress', authenticateJWT, requireRole('student'), attemptSaveLimiter, saveProgress);
router.post('/:id/submit', authenticateJWT, requireRole('student'), attemptSubmitLimiter, submitAttempt);

export default router;
