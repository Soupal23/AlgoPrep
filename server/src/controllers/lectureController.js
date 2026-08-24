import { RecordedLecture } from '../models/RecordedLecture.js';
import { Membership } from '../models/Membership.js';
import { parseAndConvertVideoUrl } from '../utils/videoUrl.js';

export const createLecture = async (req, res) => {
  const teacherId = req.user?.userId;
  const { title, description, videoUrl } = req.body;

  if (!title || !videoUrl) {
    res.status(400).json({ error: 'Title and video URL are required' });
    return;
  }

  const parseResult = parseAndConvertVideoUrl(videoUrl);
  if (!parseResult.isValid) {
    res.status(400).json({ error: parseResult.error });
    return;
  }

  const lecture = await RecordedLecture.create({
    teacherId,
    title: title.trim(),
    description: description ? description.trim() : '',
    videoUrl: videoUrl.trim(),
    embedUrl: parseResult.embedUrl
  });

  res.status(201).json({
    message: 'Recorded lecture published successfully',
    lecture
  });
};

export const getMyLectures = async (req, res) => {
  const teacherId = req.user?.userId;

  const lectures = await RecordedLecture.find({ teacherId }).sort({ uploadedAt: -1 });

  res.json({ lectures });
};

export const deleteLecture = async (req, res) => {
  const teacherId = req.user?.userId;
  const { id } = req.params;

  const result = await RecordedLecture.deleteOne({ _id: id, teacherId });
  if (result.deletedCount === 0) {
    res.status(404).json({ error: 'Lecture not found or unauthorized' });
    return;
  }

  res.json({ message: 'Lecture deleted successfully' });
};

export const getStudentLecturesFeed = async (req, res) => {
  const studentId = req.user?.userId;

  const memberships = await Membership.find({ studentId, status: 'active' }).select('teacherId');
  const teacherIds = memberships.map((m) => m.teacherId);

  if (teacherIds.length === 0) {
    res.json({ lectures: [] });
    return;
  }

  const lectures = await RecordedLecture.find({ teacherId: { $in: teacherIds } })
    .populate('teacherId', 'name email avatarUrl subjectFocus')
    .sort({ uploadedAt: -1 });

  res.json({ lectures });
};

export const getLectureById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  const lecture = await RecordedLecture.findById(id).populate('teacherId', 'name email avatarUrl subjectFocus');

  if (!lecture) {
    res.status(404).json({ error: 'Lecture not found' });
    return;
  }

  if (userRole === 'student') {
    const membership = await Membership.findOne({
      studentId: userId,
      teacherId: lecture.teacherId._id,
      status: 'active'
    });

    if (!membership) {
      res.status(403).json({ error: "Forbidden: You must join this teacher's class to view this lecture" });
      return;
    }
  } else if (userRole === 'teacher') {
    if (lecture.teacherId._id.toString() !== userId) {
      res.status(403).json({ error: 'Forbidden: You do not own this lecture' });
      return;
    }
  }

  res.json({ lecture });
};
