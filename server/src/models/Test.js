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
    kind: {
      type: String,
      enum: ['platform', 'quick', 'day', 'revision', 'final_mock'],
      default: 'platform',
      index: true
    },
    mode: {
      type: String,
      enum: ['practice', 'exam'],
      default: 'exam'
    },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null, index: true },
    roadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap', default: null, index: true },
    dayId: { type: Schema.Types.ObjectId, ref: 'Day', default: null, index: true },
    conceptKeys: [{ type: String }],
    generation: {
      status: { type: String, default: null },
      promptVersion: { type: String, default: null },
      model: { type: String, default: null },
      tokens: { type: Number, default: 0 }
    },
    conceptTagging: {
      status: {
        type: String,
        enum: ['none', 'in_progress', 'done', 'failed'],
        default: 'none'
      },
      lockedUntil: { type: Date, default: null },
      attempts: { type: Number, default: 0 },
      lastError: { type: String, default: null }
    }
  },
  { timestamps: true }
);

export const Test = model('Test', testSchema);
