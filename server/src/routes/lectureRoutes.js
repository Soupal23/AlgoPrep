import { Router } from 'express';
import {
  createLecture,
  getMyLectures,
  deleteLecture,
  getStudentLecturesFeed,
  getLectureById
} from '../controllers/lectureController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateJWT);

// Teacher endpoints
router.post('/', requireRole('teacher'), createLecture);
router.get('/mine', requireRole('teacher'), getMyLectures);
router.delete('/:id', requireRole('teacher'), deleteLecture);

// Student & detail endpoints
router.get('/feed', requireRole('student'), getStudentLecturesFeed);
router.get('/:id', getLectureById);

export default router;
