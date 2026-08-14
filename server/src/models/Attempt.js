import { Schema, model } from 'mongoose';

const attemptSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    testId: { type: Schema.Types.ObjectId, ref: 'Test', required: true, index: true },
    answers: {
      type: Map,
      of: Number,
      default: new Map()
    },
    questionStates: {
      type: Map,
      of: String,
      default: new Map()
    },
    status: {
      type: String,
      enum: ['in-progress', 'submitted', 'expired'],
      default: 'in-progress'
    },
    score: { type: Number, default: 0, index: true },
    maxScore: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    timeSpentSeconds: { type: Number, default: 0 },
    tabSwitches: { type: Number, default: 0 },
    tabSwitchEvents: [
      {
        timestamp: { type: Date, default: Date.now }
      }
    ],
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
    lastSavedVersion: { type: Number, default: 0 }
  },
  { timestamps: true }
);

attemptSchema.index({ userId: 1, testId: 1 });
attemptSchema.index({ score: -1 });

export const Attempt = model('Attempt', attemptSchema);
