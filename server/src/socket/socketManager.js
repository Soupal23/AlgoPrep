import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';
import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';

/** @type {Server} */
let io;

/**
 * Map of userId (string) → Set of socketIds.
 * Allows one user to have multiple browser tabs connected.
 */
const onlineUsers = new Map();

function addOnlineUser(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
}

function removeOnlineUser(userId, socketId) {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return;
  sockets.delete(socketId);
  if (sockets.size === 0) onlineUsers.delete(userId);
}

export function isUserOnline(userId) {
  return onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
}

/**
 * Returns the shared io instance for use in controllers.
 * Call getIO() only after initSocketServer() has been called.
 */
export function getIO() {
  if (!io) throw new Error('Socket.IO has not been initialized. Call initSocketServer first.');
  return io;
}

/**
 * Initializes Socket.IO on the provided http.Server.
 * @param {import('http').Server} httpServer
 */
export function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // ── Authentication middleware ──────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    try {
      const payload = verifyAccessToken(token);
      socket.userId = String(payload.userId);
      socket.userRole = payload.role;
      next();
    } catch {
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  // ── Connection handler ─────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.userId;
    addOnlineUser(userId, socket.id);

    // Send currently online users list to newly connected socket
    socket.emit('online_users_list', Array.from(onlineUsers.keys()));

    // Broadcast online status to everyone
    io.emit('online_status', { userId, online: true });

    // Allow clients to request online users list at any time
    socket.on('get_online_users', () => {
      socket.emit('online_users_list', Array.from(onlineUsers.keys()));
    });

    // ── join_conversation ──────────────────────────────────────────────────
    socket.on('join_conversation', async ({ conversationId }) => {
      if (!conversationId) return;
      try {
        // Verify the user is a participant before allowing them to join
        const conv = await Conversation.findById(conversationId);
        if (!conv) return;
        const isParticipant = conv.participants.some((p) => p.toString() === userId);
        if (!isParticipant) return;

        socket.join(`conv:${conversationId}`);
      } catch {
        // Silently ignore invalid conversation IDs
      }
    });

    // ── leave_conversation ─────────────────────────────────────────────────
    socket.on('leave_conversation', ({ conversationId }) => {
      if (!conversationId) return;
      socket.leave(`conv:${conversationId}`);
    });

    // ── typing_start ───────────────────────────────────────────────────────
    socket.on('typing_start', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conv:${conversationId}`).emit('partner_typing', { conversationId, userId });
    });

    // ── typing_stop ────────────────────────────────────────────────────────
    socket.on('typing_stop', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conv:${conversationId}`).emit('partner_stopped_typing', { conversationId, userId });
    });

    // ── mark_read ──────────────────────────────────────────────────────────
    socket.on('mark_read', async ({ conversationId }) => {
      if (!conversationId) return;
      try {
        await Message.updateMany(
          { conversationId, receiverId: userId, readAt: null },
          { $set: { readAt: new Date() } }
        );
        // Notify both participants so the sender's checkmarks update
        io.to(`conv:${conversationId}`).emit('messages_read', { conversationId, readBy: userId });
      } catch {
        // Silently ignore DB errors on read receipts
      }
    });

    // ── disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      removeOnlineUser(userId, socket.id);
      // Only broadcast offline if truly no tabs remain
      if (!isUserOnline(userId)) {
        io.emit('online_status', { userId, online: false });
      }
    });
  });

  console.log('🔌 Socket.IO initialized');
  return io;
}
