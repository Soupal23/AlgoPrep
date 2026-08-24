import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
    isActive: { type: Boolean, default: true },
    bio: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    subjectFocus: { type: String, default: '' },
    refreshToken: { type: String }
  },
  { timestamps: true }
);

export const User = model('User', userSchema);
