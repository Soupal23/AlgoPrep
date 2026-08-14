import { Router } from 'express';
import {
  saveProgress,
  submitAttempt,
  getAttemptById,
  getUserAttempts,
  getAttemptReview,
  getAIRevisionPlan
} from '../controllers/attemptController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

router.get('/user/my-attempts', authenticateJWT, getUserAttempts);
router.get('/:id', authenticateJWT, getAttemptById);
router.get('/:id/review', authenticateJWT, getAttemptReview);
router.get('/:id/ai-revision', authenticateJWT, getAIRevisionPlan);
router.patch('/:id/progress', authenticateJWT, saveProgress);
router.post('/:id/submit', authenticateJWT, submitAttempt);

export default router;
