import { Announcement } from '../models/Announcement.js';
import { Membership } from '../models/Membership.js';

export const createAnnouncement = async (req, res) => {
  const teacherId = req.user?.userId;
  const { title, content } = req.body;

  if (!title || !content) {
    res.status(400).json({ error: 'Title and content are required' });
    return;
  }

  const announcement = await Announcement.create({
    teacherId,
    title: title.trim(),
    content: content.trim()
  });

  res.status(201).json({
    message: 'Announcement posted successfully',
    announcement
  });
};

export const getMyAnnouncements = async (req, res) => {
  const teacherId = req.user?.userId;

  const announcements = await Announcement.find({ teacherId }).sort({ createdAt: -1 });

  res.json({ announcements });
};

export const deleteAnnouncement = async (req, res) => {
  const teacherId = req.user?.userId;
  const { id } = req.params;

  const result = await Announcement.deleteOne({ _id: id, teacherId });
  if (result.deletedCount === 0) {
    res.status(404).json({ error: 'Announcement not found or unauthorized' });
    return;
  }

  res.json({ message: 'Announcement deleted successfully' });
};

export const getStudentFeed = async (req, res) => {
  const studentId = req.user?.userId;

  // 1. Get joined teacher IDs
  const memberships = await Membership.find({ studentId }).select('teacherId');
  const teacherIds = memberships.map((m) => m.teacherId);

  if (teacherIds.length === 0) {
    res.json({ announcements: [] });
    return;
  }

  // 2. Fetch announcements from joined teachers only
  const announcements = await Announcement.find({ teacherId: { $in: teacherIds } })
    .populate('teacherId', 'name email avatarUrl subjectFocus')
    .sort({ createdAt: -1 });

  res.json({ announcements });
};
