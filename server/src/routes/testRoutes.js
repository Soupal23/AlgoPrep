import { Router } from 'express';
import { getTests, getTestById, startTestAttempt } from '../controllers/testController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

router.get('/', getTests);
router.get('/:id', getTestById);
router.post('/:id/start', authenticateJWT, startTestAttempt);

export default router;
