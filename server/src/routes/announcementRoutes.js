import { Router } from 'express';
import {
  createAnnouncement,
  getMyAnnouncements,
  deleteAnnouncement,
  getStudentFeed
} from '../controllers/announcementController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateJWT);

// Teacher management endpoints
router.post('/', requireRole('teacher'), createAnnouncement);
router.get('/mine', requireRole('teacher'), getMyAnnouncements);
router.delete('/:id', requireRole('teacher'), deleteAnnouncement);

// Student feed endpoint
router.get('/feed', requireRole('student'), getStudentFeed);

export default router;
