import mongoose from 'mongoose';

const citationSchema = new mongoose.Schema(
  {
    chunkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chunk' },
    materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Material' },
    materialName: { type: String, default: '' },
    pageNumber: { type: Number, default: 1 },
    snippet: { type: String, default: '' }
  },
  { _id: false }
);

const toolCallSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    args: { type: mongoose.Schema.Types.Mixed, default: {} },
    result: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatSession',
      required: true,
      index: true
    },
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
    role: {
      type: String,
      enum: ['user', 'assistant', 'system', 'tool'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    citations: [citationSchema],
    toolCalls: [toolCallSchema],
    tokens: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export default ChatMessage;
