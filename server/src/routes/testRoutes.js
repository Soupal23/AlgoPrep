import { Router } from 'express';
import { getTests, getTestById, startTestAttempt, createTeacherTest, deleteTest } from '../controllers/testController.js';
import { authenticateJWT, optionalJWT, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalJWT, getTests);
router.post('/', authenticateJWT, requireRole('teacher'), createTeacherTest);
router.get('/:id', optionalJWT, getTestById);
router.delete('/:id', authenticateJWT, deleteTest);
router.post('/:id/start', authenticateJWT, requireRole('student'), startTestAttempt);

export default router;
