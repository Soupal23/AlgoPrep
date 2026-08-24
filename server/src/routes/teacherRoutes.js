import { Router } from 'express';
import { getTeachers, getTeacherById } from '../controllers/userController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

router.use(authenticateJWT);

router.get('/', getTeachers);
router.get('/:id', getTeacherById);

export default router;
