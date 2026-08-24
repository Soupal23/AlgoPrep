import express from 'express';
import cors from 'cors';
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

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'AlgoPrep Server', timestamp: new Date() });
});

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
