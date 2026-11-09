import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import {
  regenerateRoadmapController,
  reorderDays,
  getDayById,
  updateDayStatusController,
  getRoadmapChangesController
} from '../controllers/roadmapController.js';
import {
  getDayNotesController,
  regenerateDayNotesController,
  markNotesReadController,
  getDayResourcesController,
  regenerateDayResourcesController,
  saveResourceFeedbackController,
  getDayTestController,
  generateFinalMockController
} from '../controllers/dayController.js';

const router = express.Router();

// Roadmap Lifecycle
router.get('/roadmaps/:id/changes', authenticateJWT, getRoadmapChangesController);
router.post('/roadmaps/:id/regenerate', authenticateJWT, regenerateRoadmapController);
router.patch('/roadmaps/:id/days/reorder', authenticateJWT, reorderDays);
router.post('/roadmaps/:id/final-mock', authenticateJWT, generateFinalMockController);

// Day Lifecycle
router.get('/days/:dayId', authenticateJWT, getDayById);
router.patch('/days/:dayId/status', authenticateJWT, updateDayStatusController);

// Day Notes Lifecycle (Phase 5)
router.get('/days/:dayId/notes', authenticateJWT, getDayNotesController);
router.post('/days/:dayId/notes/regenerate', authenticateJWT, regenerateDayNotesController);
router.post('/days/:dayId/notes/read', authenticateJWT, markNotesReadController);

// Curated Resources Lifecycle (Phase 6)
router.get('/days/:dayId/resources', authenticateJWT, getDayResourcesController);
router.post('/days/:dayId/resources/regenerate', authenticateJWT, regenerateDayResourcesController);
router.post('/resources/:id/feedback', authenticateJWT, saveResourceFeedbackController);

// Day CBT Diagnostic Test Lifecycle (Phase 7)
router.post('/days/:dayId/test', authenticateJWT, getDayTestController);

export default router;
