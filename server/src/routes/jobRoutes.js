import { Router } from 'express';
import { getJobStatus, streamJobStatus, createStreamTicket } from '../controllers/jobController.js';
import { authenticateJWT, optionalJWT } from '../middleware/auth.js';

const router = Router();

router.post('/:id/stream-ticket', authenticateJWT, createStreamTicket);
router.get('/:id', authenticateJWT, getJobStatus);
router.get('/:id/stream', optionalJWT, streamJobStatus);

export default router;
