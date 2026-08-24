import { Router } from 'express';
import {
  joinClass,
  leaveClass,
  getMyTeachers,
  getRoster,
  removeStudentFromRoster
} from '../controllers/membershipController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateJWT);

// Student endpoints
router.post('/join/:teacherId', requireRole('student'), joinClass);
router.delete('/leave/:teacherId', requireRole('student'), leaveClass);
router.get('/my-teachers', requireRole('student'), getMyTeachers);

// Teacher endpoints
router.get('/roster', requireRole('teacher'), getRoster);
router.delete('/roster/:studentId', requireRole('teacher'), removeStudentFromRoster);

export default router;
