import { Router } from 'express';
import { getProfile, updateProfile, uploadAvatarController } from '../controllers/userController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { uploadAvatar } from '../middleware/avatarUpload.js';

const router = Router();

router.use(authenticateJWT);

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.post('/avatar', uploadAvatar.single('file'), uploadAvatarController);

export default router;
