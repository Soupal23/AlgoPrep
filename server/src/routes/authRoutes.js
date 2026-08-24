import { Router } from 'express';
import { signup, login, refresh, logout, signupSchema, loginSchema } from '../controllers/authController.js';
import { validateBody } from '../middleware/validate.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';

const router = Router();

router.post('/signup', validateBody(signupSchema), signup);
router.post('/login', validateBody(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', authenticateJWT, requireRole('student', 'teacher', 'admin'), logout);

export default router;
