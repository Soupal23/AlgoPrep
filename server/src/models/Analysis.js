import { Schema, model } from 'mongoose';

const weakConceptSchema = new Schema(
  {
    conceptKey: { type: String, required: true },
    conceptTitle: { type: String, default: '' },
    mastery: { type: Number, default: 0 },
    reason: { type: String, default: '' }
  },
  { _id: false }
);

const strengthSchema = new Schema(
  {
    conceptKey: { type: String, required: true },
    conceptTitle: { type: String, default: '' },
    mastery: { type: Number, default: 1 }
  },
  { _id: false }
);

const masteryDeltaSchema = new Schema(
  {
    conceptKey: { type: String, required: true },
    conceptTitle: { type: String, default: '' },
    before: { type: Number, required: true },
    after: { type: Number, required: true },
    delta: { type: Number, required: true }
  },
  { _id: false }
);

const analysisSchema = new Schema(
  {
    attemptId: { type: Schema.Types.ObjectId, ref: 'Attempt', required: true, unique: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null, index: true },
    dayId: { type: Schema.Types.ObjectId, ref: 'Day', default: null, index: true },
    summary: { type: String, default: '' },
    weakConcepts: [weakConceptSchema],
    strengths: [strengthSchema],
    nextSteps: [{ type: String }],
    masteryDelta: [masteryDeltaSchema],
    source: {
      type: String,
      enum: ['ai', 'fallback'],
      default: 'fallback'
    }
  },
  { timestamps: true }
);

export const Analysis = model('Analysis', analysisSchema);
export default Analysis;
