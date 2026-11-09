import { Schema, model } from 'mongoose';

const topicSchema = new Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    estMinutes: { type: Number, default: 60 },
    prerequisites: [{ type: String }],
    sourceChunkIds: [{ type: Schema.Types.ObjectId, ref: 'Chunk' }],
    isExternal: { type: Boolean, default: false }
  },
  { _id: false }
);

const roadmapSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['generating', 'ready', 'failed'],
      default: 'generating',
      index: true
    },
    settings: {
      days: { type: Number, default: 7 },
      hoursPerDay: { type: Number, default: 2 },
      examDate: { type: Date, default: null },
      level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'intermediate'
      }
    },
    topics: [topicSchema],
    generation: {
      promptVersions: { type: Schema.Types.Mixed, default: {} },
      models: { type: Schema.Types.Mixed, default: {} },
      tokens: { type: Number, default: 0 },
      latencyMs: { type: Number, default: 0 }
    },
    version: { type: Number, default: 1 },
    regenerateCount: { type: Number, default: 0 },
    changeLog: [
      {
        version: { type: Number, required: true },
        change: { type: String, required: true },
        reason: { type: String, default: '' },
        at: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

export const Roadmap = model('Roadmap', roadmapSchema);
export default Roadmap;
