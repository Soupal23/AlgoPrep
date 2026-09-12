import { Schema, model } from 'mongoose';

const conversationSchema = new Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }],
    type: { type: String, enum: ['student-teacher', 'teacher-admin'], required: true },
    lastMessageAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const Conversation = model('Conversation', conversationSchema);
