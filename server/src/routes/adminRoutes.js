import { Router } from 'express';
import { getApplications, updateApplicationStatus } from '../controllers/teacherApplicationController.js';
import { getUsers, updateUserStatus } from '../controllers/adminController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateJWT, requireRole('admin'));

router.get('/teacher-applications', getApplications);
router.patch('/teacher-applications/:id', updateApplicationStatus);

router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);

export default router;
