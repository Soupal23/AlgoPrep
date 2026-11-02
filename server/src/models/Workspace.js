import { Schema, model } from 'mongoose';

const workspaceSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    examDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true
    }
  },
  { timestamps: true }
);

export const Workspace = model('Workspace', workspaceSchema);
export default Workspace;
