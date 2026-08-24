import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Membership } from '../models/Membership.js';
import { User } from '../models/User.js';

export const sendMessage = async (req, res) => {
  const senderId = req.user?.userId;
  const { recipientId, content } = req.body;

  if (!recipientId || !content || !content.trim()) {
    res.status(400).json({ error: 'Recipient ID and message content are required' });
    return;
  }

  const sender = await User.findById(senderId);
  const recipient = await User.findById(recipientId);

  if (!sender || !recipient || !recipient.isActive) {
    res.status(404).json({ error: 'Recipient user not found or inactive' });
    return;
  }

  let studentId, teacherId;
  if (sender.role === 'student' && recipient.role === 'teacher') {
    studentId = senderId;
    teacherId = recipientId;
  } else if (sender.role === 'teacher' && recipient.role === 'student') {
    teacherId = senderId;
    studentId = recipientId;
  } else {
    res.status(400).json({ error: 'Messages can only be exchanged between students and teachers' });
    return;
  }

  // Membership gating check
  const membership = await Membership.findOne({ studentId, teacherId, status: 'active' });
  if (!membership) {
    res.status(403).json({ error: "Forbidden: You must join this teacher's class to send messages" });
    return;
  }

  let conversation = await Conversation.findOne({ studentId, teacherId });
  if (!conversation) {
    conversation = await Conversation.create({ studentId, teacherId, lastMessageAt: new Date() });
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

  res.status(201).json({
    message: 'Message sent successfully',
    data: message,
    conversationId: conversation._id
  });
};

export const getConversations = async (req, res) => {
  const userId = req.user?.userId;

  const conversations = await Conversation.find({
    $or: [{ studentId: userId }, { teacherId: userId }]
  })
    .populate('studentId', 'name email avatarUrl role')
    .populate('teacherId', 'name email avatarUrl role subjectFocus')
    .sort({ lastMessageAt: -1 });

  const result = await Promise.all(
    conversations.map(async (conv) => {
      const lastMsg = await Message.findOne({ conversationId: conv._id })
        .sort({ createdAt: -1 })
        .select('content senderId readAt createdAt');

      return {
        conversationId: conv._id,
        lastMessageAt: conv.lastMessageAt,
        student: conv.studentId,
        teacher: conv.teacherId,
        lastMessage: lastMsg
      };
    })
  );

  res.json({ conversations: result });
};

export const getConversationMessages = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user?.userId;
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '50', 10);
  const since = req.query.since;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  const isParticipant =
    conversation.studentId.toString() === userId || conversation.teacherId.toString() === userId;

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
};
