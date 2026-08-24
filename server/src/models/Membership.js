import { Schema, model } from 'mongoose';

const membershipSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['active'], default: 'active' },
    joinedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

membershipSchema.index({ studentId: 1, teacherId: 1 }, { unique: true });

export const Membership = model('Membership', membershipSchema);
