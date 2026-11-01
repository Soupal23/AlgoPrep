import { Router } from 'express';
import { getJobStatus, streamJobStatus } from '../controllers/jobController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

router.use(authenticateJWT);

router.get('/:id', getJobStatus);
router.get('/:id/stream', streamJobStatus);

export default router;
