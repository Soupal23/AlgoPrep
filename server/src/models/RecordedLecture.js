import { Schema, model } from 'mongoose';

const recordedLectureSchema = new Schema(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    videoUrl: { type: String, required: true, trim: true },
    embedUrl: { type: String, required: true, trim: true },
    uploadedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const RecordedLecture = model('RecordedLecture', recordedLectureSchema);
