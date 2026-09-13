import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import { TeacherApplication } from '../models/TeacherApplication.js';
import { User } from '../models/User.js';
import { sendTeacherApprovalEmail } from '../services/emailService.js';

export const submitApplication = async (req, res) => {
  const { name, email, subjectFocus, bio } = req.body;

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

  // Ensure uploads/resumes directory exists on disk and save the binary buffer
  const filename = `${Date.now()}-${req.file.originalname}`;
  const targetDir = path.resolve('uploads', 'resumes');
  await fs.mkdir(targetDir, { recursive: true });

  const targetPath = path.join(targetDir, filename);
  await fs.writeFile(targetPath, req.file.buffer);

  const resumeUrl = `uploads/resumes/${filename}`;

  const application = await TeacherApplication.create({
    name,
    email: normalizedEmail,
    subjectFocus: subjectFocus || 'Computer Science',
    bio: bio || '',
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

  let tempPassword = null;
  let createdUser = null;

  if (status === 'approved') {
    let existingUser = await User.findOne({ email: application.email });

    if (existingUser) {
      existingUser.role = 'teacher';
      existingUser.isActive = true;
      if (application.subjectFocus) existingUser.subjectFocus = application.subjectFocus;
      if (application.bio) existingUser.bio = application.bio;
      await existingUser.save();
      createdUser = existingUser;
    } else {
      // Generate default temporary password for new teacher account
      tempPassword = 'Teacher@123';
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      createdUser = await User.create({
        name: application.name,
        email: application.email,
        password: hashedPassword,
        role: 'teacher',
        subjectFocus: application.subjectFocus || 'Computer Science',
        bio: application.bio || '',
        isActive: true
      });
    }

    // Send/log approval email
    await sendTeacherApprovalEmail({
      toName: application.name,
      toEmail: application.email,
      tempPassword: tempPassword || '(Existing User Password)'
    });
  }

  res.json({
    message: status === 'approved'
      ? `Application approved successfully. Teacher account created for ${application.email}.`
      : `Application ${status} successfully`,
    application,
    createdUser: createdUser ? {
      id: createdUser._id,
      name: createdUser.name,
      email: createdUser.email,
      role: createdUser.role,
      subjectFocus: createdUser.subjectFocus,
      bio: createdUser.bio
    } : null,
    tempPassword
  });
};
