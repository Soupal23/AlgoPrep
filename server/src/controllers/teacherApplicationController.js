import { TeacherApplication } from '../models/TeacherApplication.js';

export const submitApplication = async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    res.status(400).json({ error: 'Name and email are required' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: 'Resume file is required' });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existing = await TeacherApplication.findOne({
    email: normalizedEmail,
    status: { $in: ['pending', 'approved'] }
  });

  if (existing) {
    res.status(400).json({ error: `An application for this email is already ${existing.status}` });
    return;
  }

  // Store file metadata/data identifier
  const resumeUrl = `uploads/resumes/${Date.now()}-${req.file.originalname}`;

  const application = await TeacherApplication.create({
    name,
    email: normalizedEmail,
    resumeUrl,
    status: 'pending'
  });

  res.status(201).json({
    message: 'Teacher application submitted successfully',
    application
  });
};

export const getApplications = async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    filter.status = status;
  }

  const applications = await TeacherApplication.find(filter).sort({ submittedAt: -1 });
  res.json({ applications });
};

export const updateApplicationStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    res.status(400).json({ error: 'Status must be approved or rejected' });
    return;
  }

  const application = await TeacherApplication.findById(id);
  if (!application) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }

  application.status = status;
  await application.save();

  res.json({
    message: `Application ${status} successfully`,
    application
  });
};
