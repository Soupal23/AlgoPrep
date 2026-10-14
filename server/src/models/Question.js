import { Schema, model } from 'mongoose';

const questionSchema = new Schema(
  {
    testId: { type: Schema.Types.ObjectId, ref: 'Test', required: true, index: true },
    questionText: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctOptionIndex: { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: String, required: true },
    order: { type: Number, default: 0 },
    concept: { type: String, trim: true, default: null },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: null },
    tagSource: { type: String, enum: ['teacher', 'ai_generated', 'ai_inferred'], default: null }
  },
  { timestamps: true }
);

export const Question = model('Question', questionSchema);
