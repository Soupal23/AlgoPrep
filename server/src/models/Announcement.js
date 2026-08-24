import { Schema, model } from 'mongoose';

const announcementSchema = new Schema(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const Announcement = model('Announcement', announcementSchema);
