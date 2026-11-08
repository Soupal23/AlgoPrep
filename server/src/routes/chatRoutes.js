import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import {
  createSessionController,
  getSessionsController,
  getSessionMessagesController,
  postMessageStreamController,
  deleteSessionController
} from '../controllers/chatController.js';

const router = express.Router();

// Workspace Chat Sessions
router.post('/workspaces/:workspaceId/chat/sessions', authenticateJWT, createSessionController);
router.get('/workspaces/:workspaceId/chat/sessions', authenticateJWT, getSessionsController);

// Session Messages & Streaming
router.get('/chat/sessions/:sessionId/messages', authenticateJWT, getSessionMessagesController);
router.post('/chat/sessions/:sessionId/messages', authenticateJWT, postMessageStreamController);
router.delete('/chat/sessions/:sessionId', authenticateJWT, deleteSessionController);

export default router;
