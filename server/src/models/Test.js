import { Schema, model } from 'mongoose';

const testSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    topic: { type: String, required: true, index: true },
    timeLimitMinutes: { type: Number, required: true, default: 15 },
    markingScheme: {
      correct: { type: Number, required: true, default: 4 },
      incorrect: { type: Number, required: true, default: -1 }
    },
    totalQuestions: { type: Number, required: true, default: 10 },
    isAIGenerated: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export const Test = model('Test', testSchema);
