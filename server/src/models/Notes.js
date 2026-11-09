import { Schema, model } from 'mongoose';

const citationSchema = new Schema(
  {
    citationId: { type: String, required: true }, // e.g. "C1", "C2"
    chunkId: { type: Schema.Types.ObjectId, ref: 'Chunk', default: null },
    materialName: { type: String, default: 'Study Material' },
    location: {
      page: { type: Number, default: null },
      slide: { type: Number, default: null },
      heading: { type: String, default: null }
    },
    snippet: { type: String, default: '' }
  },
  { _id: false }
);

const noteSectionSchema = new Schema(
  {
    topicKey: { type: String, required: true },
    heading: { type: String, required: true },
    markdown: { type: String, required: true },
    citations: [citationSchema],
    isBeyondMaterials: { type: Boolean, default: false }
  },
  { _id: false }
);

const flashcardSchema = new Schema(
  {
    front: { type: String, required: true },
    back: { type: String, required: true }
  },
  { _id: false }
);

const notesSchema = new Schema(
  {
    dayId: { type: Schema.Types.ObjectId, ref: 'Day', required: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sections: [noteSectionSchema],
    keyPoints: [{ type: String }],
    flashcards: [flashcardSchema],
    status: {
      type: String,
      enum: ['generating', 'ready', 'failed'],
      default: 'ready',
      index: true
    },
    readStatus: { type: Boolean, default: false },
    generation: {
      promptVersion: { type: String, default: '1.0.0' },
      model: { type: String, default: 'gemini-3.8-flash' },
      tokens: { type: Number, default: 0 },
      latencyMs: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

notesSchema.index({ dayId: 1 }, { unique: true });
notesSchema.index({ workspaceId: 1, dayId: 1 });

export const Notes = model('Notes', notesSchema);
export default Notes;
