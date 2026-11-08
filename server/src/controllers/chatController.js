import {
  createOrGetChatSession,
  getChatSessions,
  getChatMessages,
  deleteChatSession,
  streamTutorChat
} from '../services/tutorService.js';
import { Workspace } from '../models/Workspace.js';
import logger from '../utils/logger.js';

/**
 * POST /api/workspaces/:workspaceId/chat/sessions
 */
export async function createSessionController(req, res, next) {
  try {
    const userId = (req.user.userId || req.user._id).toString();
    const { workspaceId } = req.params;
    const { dayId, title } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found' });
    }

    if (workspace.ownerId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const session = await createOrGetChatSession({
      workspaceId,
      ownerId: userId,
      dayId,
      title
    });

    res.status(201).json({
      success: true,
      session
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/workspaces/:workspaceId/chat/sessions
 */
export async function getSessionsController(req, res, next) {
  try {
    const userId = (req.user.userId || req.user._id).toString();
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found' });
    }

    if (workspace.ownerId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const sessions = await getChatSessions({ workspaceId, ownerId: userId });

    res.json({
      success: true,
      sessions
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/chat/sessions/:sessionId/messages
 */
export async function getSessionMessagesController(req, res, next) {
  try {
    const userId = (req.user.userId || req.user._id).toString();
    const { sessionId } = req.params;

    const messages = await getChatMessages({ sessionId, ownerId: userId });

    res.json({
      success: true,
      messages
    });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

/**
 * DELETE /api/chat/sessions/:sessionId
 */
export async function deleteSessionController(req, res, next) {
  try {
    const userId = (req.user.userId || req.user._id).toString();
    const { sessionId } = req.params;

    await deleteChatSession({ sessionId, ownerId: userId });

    res.json({
      success: true,
      message: 'Chat session deleted successfully'
    });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/chat/sessions/:sessionId/messages (SSE Stream)
 */
export async function postMessageStreamController(req, res) {
  const userId = (req.user.userId || req.user._id).toString();
  const { sessionId } = req.params;
  const { message } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Keep-alive heartbeat interval
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (e) {
      clearInterval(heartbeat);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });

  await streamTutorChat({
    sessionId,
    ownerId: userId,
    userMessage: message.trim(),
    onMeta: (meta) => {
      res.write(`event: meta\ndata: ${JSON.stringify(meta)}\n\n`);
    },
    onChunk: (chunk) => {
      res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
    },
    onDone: (result) => {
      clearInterval(heartbeat);
      res.write(`event: done\ndata: ${JSON.stringify(result)}\n\n`);
      res.end();
    },
    onError: (err) => {
      clearInterval(heartbeat);
      const status = err.statusCode || 500;
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message, status })}\n\n`);
      res.end();
    }
  });
}
