import { Router } from 'express';
import { getUsers, updateUserStatus, getObservabilityStatsController } from '../controllers/adminController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateJWT, requireRole('admin'));

router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);
router.get('/observability', getObservabilityStatsController);

export default router;
