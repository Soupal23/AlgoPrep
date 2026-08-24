import { User } from '../models/User.js';

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
      avatarUrl: user.avatarUrl,
      subjectFocus: user.subjectFocus,
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

  const avatarUrl = `uploads/avatars/${Date.now()}-${req.file.originalname}`;
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
      subjectFocus: user.subjectFocus,
      isActive: user.isActive
    }
  });
};

export const getTeachers = async (req, res) => {
  const teachers = await User.find({ role: 'teacher', isActive: true })
    .select('_id name email bio avatarUrl subjectFocus createdAt')
    .sort({ name: 1 });

  res.json({ teachers });
};

export const getTeacherById = async (req, res) => {
  const { id } = req.params;

  const teacher = await User.findOne({ _id: id, role: 'teacher', isActive: true })
    .select('_id name email bio avatarUrl subjectFocus createdAt');

  if (!teacher) {
    res.status(404).json({ error: 'Teacher profile not found' });
    return;
  }

  res.json({ teacher });
};
