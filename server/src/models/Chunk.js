import { Schema, model } from 'mongoose';

const chunkSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    materialId: { type: Schema.Types.ObjectId, ref: 'Material', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true },
    tokenCount: { type: Number, default: 0 },
    location: {
      page: { type: Number, default: null },
      slide: { type: Number, default: null },
      heading: { type: String, default: null }
    },
    embedding: {
      type: [Number],
      default: []
    },
    embeddingStatus: {
      type: String,
      enum: ['ready', 'failed', 'pending'],
      default: 'ready',
      index: true
    },
    embeddingModel: { type: String, default: 'text-embedding-004' },
    embeddingDim: { type: Number, default: 768 },
    hash: { type: String, required: true, index: true }
  },
  { timestamps: true }
);

chunkSchema.index({ workspaceId: 1, hash: 1 });
chunkSchema.index({ workspaceId: 1, materialId: 1 });

export const Chunk = model('Chunk', chunkSchema);
export default Chunk;
