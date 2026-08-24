import { Schema, model } from 'mongoose';

const conversationSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lastMessageAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

conversationSchema.index({ studentId: 1, teacherId: 1 }, { unique: true });

export const Conversation = model('Conversation', conversationSchema);
