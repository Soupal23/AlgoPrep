import { Schema, model } from 'mongoose';

const resourceSchema = new Schema(
  {
    source: {
      type: String,
      enum: ['youtube', 'web', 'wikipedia', 'archive', 'openlibrary', 'googlebooks', 'arxiv'],
      required: true,
      index: true
    },
    externalId: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    thumbnail: {
      type: String,
      default: null
    },
    durationSec: {
      type: Number,
      default: null
    },
    authorOrChannel: {
      type: String,
      default: ''
    },
    language: {
      type: String,
      default: 'en'
    },
    stats: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      citations: { type: Number, default: 0 },
      publishedAt: { type: Date, default: null }
    },
    qualityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 70
    },
    embedding: {
      type: [Number],
      default: []
    },
    lastCheckedAt: {
      type: Date,
      default: Date.now
    },
    isAlive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

resourceSchema.index({ source: 1, externalId: 1 }, { unique: true });
resourceSchema.index({ url: 1 });

export const Resource = model('Resource', resourceSchema);
export default Resource;
