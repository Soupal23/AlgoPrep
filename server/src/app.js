import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { generalLimiter } from './middleware/rateLimits.js';
import authRoutes from './routes/authRoutes.js';
import testRoutes from './routes/testRoutes.js';
import attemptRoutes from './routes/attemptRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import teacherApplicationRoutes from './routes/teacherApplicationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import membershipRoutes from './routes/membershipRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import lectureRoutes from './routes/lectureRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

import path from 'path';

const app = express();

// Behind Render's reverse proxy: trust the first hop so req.ip is the real client IP.
const trustProxyRaw = process.env.TRUST_PROXY ?? '1';
const trustProxyNum = Number(trustProxyRaw);
app.set('trust proxy', Number.isNaN(trustProxyNum) ? trustProxyRaw : trustProxyNum);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  exposedHeaders: ['RateLimit', 'RateLimit-Policy', 'Retry-After']
}));

app.use('/uploads', express.static(path.resolve('uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'AlgoPrep Server', timestamp: new Date() });
});

// General per-user (IP fallback) budget. Auth and exam save/submit routes have
// their own dedicated limiters applied at the route level.
app.use('/api', generalLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/teacher-applications', teacherApplicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/lectures', lectureRoutes);

app.use(errorHandler);

export default app;
