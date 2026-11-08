import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import { uploadMaterialsMiddleware } from '../middleware/materialUpload.js';
import { uploadLimiter } from '../middleware/rateLimits.js';
import {
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  searchWorkspace,
  getWorkspaceTests,
  getWorkspaceMasteryController
} from '../controllers/workspaceController.js';
import {
  uploadMaterials,
  getMaterials,
  getMaterialById,
  deleteMaterial
} from '../controllers/materialController.js';
import {
  createOrGenerateRoadmap,
  getWorkspaceRoadmap
} from '../controllers/roadmapController.js';

const router = express.Router();

// Workspace CRUD & Semantic Search
router.route('/')
  .post(authenticateJWT, createWorkspace)
  .get(authenticateJWT, getWorkspaces);

router.route('/:id')
  .get(authenticateJWT, getWorkspaceById)
  .put(authenticateJWT, updateWorkspace)
  .delete(authenticateJWT, deleteWorkspace);

router.route('/:id/roadmap')
  .post(authenticateJWT, createOrGenerateRoadmap)
  .get(authenticateJWT, getWorkspaceRoadmap);

router.get('/:id/tests', authenticateJWT, getWorkspaceTests);
router.get('/:id/mastery', authenticateJWT, getWorkspaceMasteryController);

router.post('/:id/search', authenticateJWT, searchWorkspace);

// Materials Management
router.route('/:id/materials')
  .post(authenticateJWT, uploadLimiter, uploadMaterialsMiddleware.array('files', 10), uploadMaterials)
  .get(authenticateJWT, getMaterials);

router.route('/:id/materials/:materialId')
  .get(authenticateJWT, getMaterialById)
  .delete(authenticateJWT, deleteMaterial);

export default router;
