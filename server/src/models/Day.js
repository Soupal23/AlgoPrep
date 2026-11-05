import { Schema, model } from 'mongoose';

const daySchema = new Schema(
  {
    roadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap', required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dayNumber: { type: Number, required: true },
    title: { type: String, required: true },
    objectives: [{ type: String }],
    topicKeys: [{ type: String }],
    estMinutes: { type: Number, default: 120 },
    type: {
      type: String,
      enum: ['learn', 'revision', 'mock'],
      default: 'learn'
    },
    status: {
      type: String,
      enum: ['locked', 'available', 'in_progress', 'completed'],
      default: 'locked',
      index: true
    },
    content: {
      notesStatus: {
        type: String,
        enum: ['pending', 'ready', 'failed'],
        default: 'pending'
      },
      resourcesStatus: {
        type: String,
        enum: ['pending', 'ready', 'failed'],
        default: 'pending'
      },
      testStatus: {
        type: String,
        enum: ['pending', 'ready', 'failed'],
        default: 'pending'
      }
    }
  },
  { timestamps: true }
);

daySchema.index({ roadmapId: 1, dayNumber: 1 }, { unique: true });

export const Day = model('Day', daySchema);
export default Day;
