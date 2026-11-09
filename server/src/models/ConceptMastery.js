import { Schema, model } from 'mongoose';

const historyItemSchema = new Schema(
  {
    attemptId: { type: Schema.Types.ObjectId, ref: 'Attempt', required: true },
    performance: { type: Number, required: true },
    at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const conceptMasterySchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    conceptKey: { type: String, required: true, index: true },
    conceptTitle: { type: String, default: '' },
    mastery: { type: Number, min: 0, max: 1, default: 0.5 },
    attempts: { type: Number, default: 0 },
    lastPracticedAt: { type: Date, default: Date.now },
    nextReviewAt: { type: Date, default: null },
    history: [historyItemSchema]
  },
  { timestamps: true }
);

conceptMasterySchema.index({ ownerId: 1, workspaceId: 1, conceptKey: 1 }, { unique: true });

export const ConceptMastery = model('ConceptMastery', conceptMasterySchema);
export default ConceptMastery;
