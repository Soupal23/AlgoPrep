import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import {
  regenerateRoadmapController,
  reorderDays,
  getDayById,
  updateDayStatusController
} from '../controllers/roadmapController.js';

const router = express.Router();

// Roadmap Lifecycle
router.post('/roadmaps/:id/regenerate', authenticateJWT, regenerateRoadmapController);
router.patch('/roadmaps/:id/days/reorder', authenticateJWT, reorderDays);

// Day Lifecycle
router.get('/days/:dayId', authenticateJWT, getDayById);
router.patch('/days/:dayId/status', authenticateJWT, updateDayStatusController);

export default router;
