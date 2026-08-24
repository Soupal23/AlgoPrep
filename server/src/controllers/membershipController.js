import { Membership } from '../models/Membership.js';
import { User } from '../models/User.js';

export const joinClass = async (req, res) => {
  const studentId = req.user?.userId;
  const { teacherId } = req.params;

  const teacher = await User.findOne({ _id: teacherId, role: 'teacher', isActive: true });
  if (!teacher) {
    res.status(404).json({ error: 'Teacher not found or inactive' });
    return;
  }

  // Idempotent findOrCreate
  let membership = await Membership.findOne({ studentId, teacherId });
  if (!membership) {
    membership = await Membership.create({ studentId, teacherId, status: 'active' });
  }

  res.status(200).json({
    message: 'Successfully joined teacher class',
    membership
  });
};

export const leaveClass = async (req, res) => {
  const studentId = req.user?.userId;
  const { teacherId } = req.params;

  await Membership.deleteOne({ studentId, teacherId });

  res.json({ message: 'Left class successfully' });
};

export const getMyTeachers = async (req, res) => {
  const studentId = req.user?.userId;

  const memberships = await Membership.find({ studentId })
    .populate('teacherId', 'name email bio avatarUrl subjectFocus')
    .sort({ joinedAt: -1 });

  const teachers = memberships
    .filter((m) => m.teacherId)
    .map((m) => ({
      membershipId: m._id,
      joinedAt: m.joinedAt,
      teacher: m.teacherId
    }));

  res.json({ teachers });
};

export const getRoster = async (req, res) => {
  const teacherId = req.user?.userId;

  const memberships = await Membership.find({ teacherId })
    .populate('studentId', 'name email bio avatarUrl isActive')
    .sort({ joinedAt: -1 });

  const roster = memberships
    .filter((m) => m.studentId)
    .map((m) => ({
      membershipId: m._id,
      joinedAt: m.joinedAt,
      student: m.studentId
    }));

  res.json({ roster });
};

export const removeStudentFromRoster = async (req, res) => {
  const teacherId = req.user?.userId;
  const { studentId } = req.params;

  const result = await Membership.deleteOne({ studentId, teacherId });
  if (result.deletedCount === 0) {
    res.status(404).json({ error: 'Student is not in your class roster' });
    return;
  }

  res.json({ message: 'Student removed from class roster successfully' });
};
