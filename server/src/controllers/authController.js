import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { config } from '../config/env.js';

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const signup = async (req, res) => {
  const { name, email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    res.status(400).json({ error: 'User with this email already exists' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({
    name,
    email: normalizedEmail,
    password: hashedPassword,
    role: 'student',
    isActive: true
  });

  const payload = { userId: user._id.toString(), email: user.email, role: user.role, isActive: user.isActive };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  user.refreshToken = refreshToken;
  await user.save();

  res.status(201).json({
    message: 'User registered successfully',
    user: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive },
    accessToken,
    refreshToken
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = (email || '').toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ error: 'Account is deactivated' });
    return;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const payload = { userId: user._id.toString(), email: user.email, role: user.role, isActive: user.isActive };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  user.refreshToken = refreshToken;
  await user.save();

  res.json({
    message: 'Login successful',
    user: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive },
    accessToken,
    refreshToken
  });
};

export const refresh = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token is required' });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.userId);

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (user.refreshToken && user.refreshToken !== refreshToken) {
      res.status(401).json({ error: 'Invalid or revoked refresh token' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Account is deactivated' });
      return;
    }

    const newPayload = { userId: user._id.toString(), email: user.email, role: user.role, isActive: user.isActive };
    const newAccessToken = generateAccessToken(newPayload);

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(401).json({ error: 'Expired or invalid refresh token' });
  }
};

export const logout = async (req, res) => {
  if (req.user?.userId) {
    await User.findByIdAndUpdate(req.user.userId, { $unset: { refreshToken: 1 } });
  }
  res.json({ message: 'Logged out successfully' });
};
