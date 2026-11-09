import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { Roadmap } from '../models/Roadmap.js';
import { Attempt } from '../models/Attempt.js';
import { Job } from '../models/Job.js';
import { observability } from '../utils/observability.js';

export const getUsers = async (req, res) => {
  const { role, isActive } = req.query;
  const filter = {};

  if (role && ['student', 'admin'].includes(role)) {
    filter.role = role;
  }

  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  const users = await User.find(filter)
    .select('-password -refreshToken')
    .sort({ createdAt: -1 });

  res.json({ users });
};

export const updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    res.status(400).json({ error: 'isActive boolean flag is required' });
    return;
  }

  const user = await User.findById(id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (user._id.toString() === req.user?.userId && !isActive) {
    res.status(400).json({ error: 'Cannot deactivate your own admin account' });
    return;
  }

  user.isActive = isActive;
  await user.save();

  res.json({
    message: `User ${isActive ? 'activated' : 'deactivated (soft-deleted)'} successfully`,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      updatedAt: user.updatedAt
    }
  });
};

export const getObservabilityStatsController = async (req, res) => {
  try {
    const stats = observability.getStats();

    const [totalWorkspaces, totalRoadmaps, totalAttempts, totalJobs] = await Promise.all([
      Workspace.countDocuments(),
      Roadmap.countDocuments(),
      Attempt.countDocuments(),
      Job.countDocuments()
    ]);

    res.json({
      success: true,
      llmMetrics: stats,
      platformMetrics: {
        totalWorkspaces,
        totalRoadmaps,
        totalAttempts,
        totalJobs
      },
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve observability metrics' });
  }
};
