/**
 * Email Service Module
 * Handles sending emails for teacher application approval and system notifications.
 * In development, logs a styled simulated email to the server console.
 */

export const sendTeacherApprovalEmail = async ({ toName, toEmail, tempPassword }) => {
  const subject = '🎉 Welcome to AlgoPrep — Your Instructor Application Has Been Approved!';
  const message = `
================================================================================
[EMAIL SERVICE SIMULATION]
To: ${toName} <${toEmail}>
Subject: ${subject}
--------------------------------------------------------------------------------
Dear ${toName},

Great news! Your teacher application to AlgoPrep has been approved by our admin team.

An instructor account has been created for you with the following credentials:

  - Portal URL: http://localhost:5173/login
  - Login Email: ${toEmail}
  - Temporary Password: ${tempPassword}

Please log in using these credentials. We recommend changing your password 
from your Profile page after your first login.

Welcome aboard,
The AlgoPrep Engineering & Admin Team
================================================================================
`;

  // Log to server console for simulation/debugging
  console.log(message);

  return {
    success: true,
    simulated: true,
    to: toEmail,
    subject
  };
};
