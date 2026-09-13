import fs from 'fs/promises';
import path from 'path';

/**
 * Storage Service to handle saving and deleting uploaded files.
 * In development mode, saves to local disk under server/uploads/<subfolder>.
 * Prepared for production cloud storage integration (Cloudinary / AWS S3 / Cloudflare R2).
 */

export const saveUploadedFile = async ({ buffer, originalname, subfolder }) => {
  // Production Cloud Storage Hook (Uncomment & configure when ready to deploy)
  // if (process.env.NODE_ENV === 'production') {
  //   return await uploadToCloudStorage({ buffer, originalname, subfolder });
  // }

  // Local Disk Storage (Development)
  const safeFilename = `${Date.now()}-${originalname.replace(/\s+/g, '_')}`;
  const targetDir = path.resolve('uploads', subfolder);

  await fs.mkdir(targetDir, { recursive: true });
  const targetPath = path.join(targetDir, safeFilename);

  await fs.writeFile(targetPath, buffer);

  // Return normalized URL path for database storage
  return `uploads/${subfolder}/${safeFilename}`;
};

export const deleteUploadedFile = async (filePath) => {
  if (!filePath || filePath.startsWith('http://') || filePath.startsWith('https://')) {
    // Cloud storage deletion hook can be implemented here for production
    return;
  }

  try {
    const fullPath = path.resolve(filePath);
    await fs.unlink(fullPath);
  } catch (err) {
    // Ignore error if file doesn't exist locally
    if (err.code !== 'ENOENT') {
      console.error(`Failed to delete local file at ${filePath}:`, err);
    }
  }
};
