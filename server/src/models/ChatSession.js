import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    dayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Day',
      default: null,
      index: true
    },
    title: {
      type: String,
      default: 'New Study Chat',
      trim: true
    },
    summary: {
      type: String,
      default: ''
    },
    messageCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

chatSessionSchema.index({ workspaceId: 1, ownerId: 1, createdAt: -1 });

export const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
export default ChatSession;
