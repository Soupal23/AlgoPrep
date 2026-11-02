import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import { uploadMaterialsMiddleware } from '../middleware/materialUpload.js';
import {
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  searchWorkspace
} from '../controllers/workspaceController.js';
import {
  uploadMaterials,
  getMaterials,
  getMaterialById,
  deleteMaterial
} from '../controllers/materialController.js';

const router = express.Router();

// Workspace CRUD & Semantic Search
router.route('/')
  .post(authenticateJWT, createWorkspace)
  .get(authenticateJWT, getWorkspaces);

router.route('/:id')
  .get(authenticateJWT, getWorkspaceById)
  .put(authenticateJWT, updateWorkspace)
  .delete(authenticateJWT, deleteWorkspace);

router.post('/:id/search', authenticateJWT, searchWorkspace);

// Materials Management
router.route('/:id/materials')
  .post(authenticateJWT, uploadMaterialsMiddleware.array('files', 10), uploadMaterials)
  .get(authenticateJWT, getMaterials);

router.route('/:id/materials/:materialId')
  .get(authenticateJWT, getMaterialById)
  .delete(authenticateJWT, deleteMaterial);

export default router;
