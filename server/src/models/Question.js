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
    conceptKey: { type: String, trim: true, default: null, index: true },
    bloomLevel: {
      type: String,
      enum: ['remember', 'understand', 'apply', 'analyze', null],
      default: null
    },
    sourceChunkIds: [{ type: Schema.Types.ObjectId, ref: 'Chunk' }],
    type: {
      type: String,
      enum: ['mcq_single', 'mcq_multi', 'numerical', 'short_answer'],
      default: 'mcq_single'
    },
    answer: { type: Schema.Types.Mixed, default: null },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: null },
    tagSource: { type: String, enum: ['teacher', 'ai_generated', 'ai_inferred'], default: null }
  },
  { timestamps: true }
);

export const Question = model('Question', questionSchema);
