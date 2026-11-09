import { Schema, model } from 'mongoose';

const materialSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: {
      type: String,
      enum: ['syllabus', 'notes', 'slides', 'book', 'other'],
      default: 'notes',
      index: true
    },
    fileName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, default: 0 },
    cloudinaryUrl: { type: String, default: '' },
    cloudinaryPublicId: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'processing', 'ready', 'failed'],
      default: 'pending',
      index: true
    },
    error: { type: String, default: null },
    pageCount: { type: Number, default: 0 },
    charCount: { type: Number, default: 0 },
    chunkCount: { type: Number, default: 0 },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', default: null }
  },
  { timestamps: true }
);

export const Material = model('Material', materialSchema);
export default Material;
