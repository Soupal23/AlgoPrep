import { Schema, model } from 'mongoose';

const dayResourceSchema = new Schema(
  {
    dayId: {
      type: Schema.Types.ObjectId,
      ref: 'Day',
      required: true,
      index: true
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    topicKey: {
      type: String,
      required: true,
      index: true
    },
    topicTitle: {
      type: String,
      default: ''
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      ref: 'Resource',
      required: true
    },
    rank: {
      type: Number,
      required: true
    },
    finalScore: {
      type: Number,
      default: 0
    },
    whyRecommended: {
      type: String,
      default: ''
    },
    feedback: {
      helpful: { type: Boolean, default: null },
      watched: { type: Boolean, default: false },
      updatedAt: { type: Date, default: null }
    }
  },
  { timestamps: true }
);

dayResourceSchema.index({ dayId: 1, topicKey: 1 });
dayResourceSchema.index({ dayId: 1, resourceId: 1 }, { unique: true });

export const DayResource = model('DayResource', dayResourceSchema);
export default DayResource;
