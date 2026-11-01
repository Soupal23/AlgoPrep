import { Schema, model } from 'mongoose';

const jobSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['ingest', 'roadmap', 'day_content', 'resources', 'analysis', 'test_job'],
      required: true,
      index: true
    },
    refId: { type: Schema.Types.ObjectId, default: null, index: true },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed'],
      default: 'queued',
      index: true
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    stage: { type: String, default: 'Queued' },
    error: { type: String, default: null },
    result: { type: Schema.Types.Mixed, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const Job = model('Job', jobSchema);
export default Job;
