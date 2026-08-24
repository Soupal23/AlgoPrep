import { Schema, model } from 'mongoose';

const teacherApplicationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    resumeUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    submittedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const TeacherApplication = model('TeacherApplication', teacherApplicationSchema);
