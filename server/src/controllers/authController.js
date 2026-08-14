import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const signup = async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    res.status(400).json({ error: 'User with this email already exists' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({
    name,
    email: email.toLowerCase(),
    password: hashedPassword
  });

  const payload = { userId: user._id.toString(), email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  user.refreshToken = refreshToken;
  await user.save();

  res.status(201).json({
    message: 'User registered successfully',
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    accessToken,
    refreshToken
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase();

  let user = await User.findOne({ email: normalizedEmail });

  // Auto-provision demo accounts if database has not been seeded yet
  if (!user && normalizedEmail === 'student@algoprep.com' && password === 'password123') {
    const hashedPassword = await bcrypt.hash('password123', 10);
    user = await User.create({
      name: 'Alex Student',
      email: 'student@algoprep.com',
      password: hashedPassword,
      role: 'student'
    });
  } else if (!user && normalizedEmail === 'admin@algoprep.com' && password === 'password123') {
    const hashedPassword = await bcrypt.hash('password123', 10);
    user = await User.create({
      name: 'Admin Instructor',
      email: 'admin@algoprep.com',
      password: hashedPassword,
      role: 'admin'
    });
  }

  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const payload = { userId: user._id.toString(), email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  user.refreshToken = refreshToken;
  await user.save();

  res.json({
    message: 'Login successful',
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
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

    if (!user || user.refreshToken !== refreshToken) {
      res.status(401).json({ error: 'Invalid or revoked refresh token' });
      return;
    }

    const newPayload = { userId: user._id.toString(), email: user.email, role: user.role };
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
