import { Schema, model } from 'mongoose';

const resourceQueryCacheSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    topicTitle: {
      type: String,
      default: ''
    },
    level: {
      type: String,
      default: 'intermediate'
    },
    resourceIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Resource'
      }
    ],
    metadata: {
      rankedCount: { type: Number, default: 0 },
      sourceBreakdown: { type: Schema.Types.Mixed, default: {} }
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 30 * 24 * 60 * 60 // 30-day TTL index
    }
  },
  { timestamps: true }
);

export const ResourceQueryCache = model('ResourceQueryCache', resourceQueryCacheSchema);
export default ResourceQueryCache;
