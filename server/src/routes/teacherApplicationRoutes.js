import { Router } from 'express';
import { submitApplication } from '../controllers/teacherApplicationController.js';
import { uploadResume } from '../middleware/resumeUpload.js';

const router = Router();

router.post('/apply', uploadResume.single('file'), submitApplication);

export default router;
