import { Router } from 'express';
import { signup, login, refresh, logout, signupSchema, loginSchema } from '../controllers/authController.js';
import { validateBody } from '../middleware/validate.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { authLimiter, refreshLimiter } from '../middleware/rateLimits.js';

const router = Router();

router.post('/signup', authLimiter, validateBody(signupSchema), signup);
router.post('/login', authLimiter, validateBody(loginSchema), login);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', authenticateJWT, requireRole('student', 'teacher', 'admin'), logout);

export default router;
