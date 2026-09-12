import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Membership } from '../models/Membership.js';
import { User } from '../models/User.js';
import { getIO } from '../socket/socketManager.js';

export const sendMessage = async (req, res, next) => {
  try {
    const senderId = req.user?.userId;
    const { recipientId, content } = req.body;

    if (!recipientId || !content || !content.trim()) {
      res.status(400).json({ error: 'Recipient ID and message content are required' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      res.status(400).json({ error: 'Invalid recipient ID' });
      return;
    }

    const sender = await User.findById(senderId);
    const recipient = await User.findById(recipientId);

    if (!sender || !recipient || !recipient.isActive) {
      res.status(404).json({ error: 'Recipient user not found or inactive' });
      return;
    }

    let convType;
    let studentId, teacherId;

    if ((sender.role === 'student' && recipient.role === 'teacher') ||
        (sender.role === 'teacher' && recipient.role === 'student')) {
      convType = 'student-teacher';
      studentId = sender.role === 'student' ? senderId : recipientId;
      teacherId = sender.role === 'teacher' ? senderId : recipientId;
    } else if ((sender.role === 'teacher' && recipient.role === 'admin') ||
               (sender.role === 'admin' && recipient.role === 'teacher')) {
      convType = 'teacher-admin';
    } else {
      res.status(400).json({ error: 'Direct messaging is only allowed between students and teachers, or teachers and admins' });
      return;
    }

    // Membership gating check (only for student-teacher conversations)
    if (convType === 'student-teacher') {
      const membership = await Membership.findOne({ studentId, teacherId, status: 'active' });
      if (!membership) {
        res.status(403).json({ error: "Forbidden: You must join this teacher's class to send messages" });
        return;
      }
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, recipientId] },
      type: convType
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, recipientId],
        type: convType,
        lastMessageAt: new Date()
      });
    } else {
      conversation.lastMessageAt = new Date();
      await conversation.save();
    }

    const message = await Message.create({
      conversationId: conversation._id,
      senderId,
      receiverId: recipientId,
      content: content.trim()
    });

    // Emit real-time events to conversation room AND user-specific rooms
    try {
      const io = getIO();
      const messagePayload = {
        _id: message._id,
        conversationId: conversation._id,
        senderId,
        receiverId: recipientId,
        content: message.content,
        createdAt: message.createdAt,
        readAt: null
      };

      // Emit new_message to conversation room as well as individual user rooms (Socket.IO deduplicates)
      io.to(`conv:${conversation._id}`)
        .to(`user:${senderId}`)
        .to(`user:${recipientId}`)
        .emit('new_message', messagePayload);

      // Populate conversation details for real-time sidebar creation
      const populatedConv = await Conversation.findById(conversation._id)
        .populate('participants', 'name email avatarUrl role subjectFocus');

      if (populatedConv) {
        const senderPartner = populatedConv.participants.find((p) => p._id.toString() !== senderId);
        const recipientPartner = populatedConv.participants.find((p) => p._id.toString() !== recipientId);

        const lastMessageObj = {
          content: message.content,
          senderId,
          readAt: null,
          createdAt: message.createdAt
        };

        io.to(`user:${senderId}`).emit('new_conversation', {
          conversationId: conversation._id,
          type: conversation.type,
          lastMessageAt: conversation.lastMessageAt,
          participants: populatedConv.participants,
          partner: senderPartner,
          lastMessage: lastMessageObj
        });

        io.to(`user:${recipientId}`).emit('new_conversation', {
          conversationId: conversation._id,
          type: conversation.type,
          lastMessageAt: conversation.lastMessageAt,
          participants: populatedConv.participants,
          partner: recipientPartner,
          lastMessage: lastMessageObj
        });
      }
    } catch {
      // Socket.IO may not be ready in test environments — ignore gracefully
    }

    res.status(201).json({
      message: 'Message sent successfully',
      data: message,
      conversationId: conversation._id
    });
  } catch (err) {
    next(err);
  }
};

export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user?.userId;

    const conversations = await Conversation.find({
      participants: userId
    })
      .populate('participants', 'name email avatarUrl role subjectFocus')
      .sort({ lastMessageAt: -1 });

    const result = await Promise.all(
      conversations.map(async (conv) => {
        const lastMsg = await Message.findOne({ conversationId: conv._id })
          .sort({ createdAt: -1 })
          .select('content senderId readAt createdAt');

        const partner = conv.participants.find(
          (p) => p._id.toString() !== userId
        );

        return {
          conversationId: conv._id,
          type: conv.type,
          lastMessageAt: conv.lastMessageAt,
          participants: conv.participants,
          partner,
          lastMessage: lastMsg
        };
      })
    );

    res.json({ conversations: result });
  } catch (err) {
    next(err);
  }
};

export const getConversationMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?.userId;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '50', 10);
    const since = req.query.since;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      res.json({ conversationId, messages: [] });
      return;
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId
    );

    if (!isParticipant) {
      res.status(403).json({ error: 'Forbidden: You are not a participant in this conversation' });
      return;
    }

    // Mark unread incoming messages as read
    await Message.updateMany(
      { conversationId, receiverId: userId, readAt: null },
      { $set: { readAt: new Date() } }
    );

    const query = { conversationId };
    if (since) {
      query.createdAt = { $gt: new Date(since) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      conversationId,
      messages
    });
  } catch (err) {
    next(err);
  }
};

export const getContacts = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    let contacts = [];

    if (user.role === 'student') {
      const memberships = await Membership.find({ studentId: userId, status: 'active' })
        .populate('teacherId', 'name email avatarUrl role subjectFocus');
      contacts = memberships.map((m) => m.teacherId).filter(Boolean);
    } else if (user.role === 'teacher') {
      const memberships = await Membership.find({ teacherId: userId, status: 'active' })
        .populate('studentId', 'name email avatarUrl role');
      const students = memberships.map((m) => m.studentId).filter(Boolean);
      const admins = await User.find({ role: 'admin', isActive: true }).select('name email avatarUrl role');
      contacts = [...students, ...admins];
    } else if (user.role === 'admin') {
      contacts = await User.find({ role: 'teacher', isActive: true }).select('name email avatarUrl role subjectFocus');
    }

    res.json({ contacts });
  } catch (err) {
    next(err);
  }
};

