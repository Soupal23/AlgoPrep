import { User } from '../models/User.js';
import { saveUploadedFile, deleteUploadedFile } from '../services/storageService.js';

export const getProfile = async (req, res) => {
  const userId = req.user?.userId;
  const user = await User.findById(userId).select('-password -refreshToken');

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ user });
};

export const updateProfile = async (req, res) => {
  const userId = req.user?.userId;
  const { name, bio, subjectFocus } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (name !== undefined) user.name = name.trim();
  if (bio !== undefined) user.bio = bio.trim();
  if (subjectFocus !== undefined) user.subjectFocus = subjectFocus.trim();

  await user.save();

  res.json({
    message: 'Profile updated successfully',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      bio: user.bio,
      subjectFocus: user.subjectFocus,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive
    }
  });
};

export const uploadAvatarController = async (req, res) => {
  const userId = req.user?.userId;

  if (!req.file) {
    res.status(400).json({ error: 'Avatar image file is required' });
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Delete previous avatar if it exists
  if (user.avatarUrl) {
    await deleteUploadedFile(user.avatarUrl);
  }

  const avatarUrl = await saveUploadedFile({
    buffer: req.file.buffer,
    originalname: req.file.originalname,
    subfolder: 'avatars'
  });

  user.avatarUrl = avatarUrl;
  await user.save();

  res.json({
    message: 'Avatar uploaded successfully',
    avatarUrl,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive
    }
  });
};
