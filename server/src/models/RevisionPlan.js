import { Schema, model } from 'mongoose';

const revisionPlanSchema = new Schema(
  {
    attemptId: {
      type: Schema.Types.ObjectId,
      ref: 'Attempt',
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    testId: {
      type: Schema.Types.ObjectId,
      ref: 'Test',
      required: true,
      index: true
    },
    source: {
      type: String,
      enum: ['ai', 'fallback'],
      required: true
    },
    schemaVersion: {
      type: Number,
      default: 1
    },
    plan: {
      type: Schema.Types.Mixed,
      required: true
    },
    conceptKeys: [
      {
        type: String,
        trim: true
      }
    ],
    regenerateCount: {
      type: Number,
      default: 0
    },
    previousPlan: {
      type: Schema.Types.Mixed,
      default: null
    },
    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

revisionPlanSchema.index({ userId: 1, testId: 1 });
revisionPlanSchema.index({ userId: 1, createdAt: -1 });

export const RevisionPlan = model('RevisionPlan', revisionPlanSchema);
