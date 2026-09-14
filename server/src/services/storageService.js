import fs from 'fs/promises';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import { config } from '../config/env.js';

cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret
});

/**
 * Storage Service to handle saving and deleting uploaded files.
 * In development mode, saves to local disk under server/uploads/<subfolder>.
 * Prepared for production cloud storage integration (Cloudinary / AWS S3 / Cloudflare R2).
 */

export const saveUploadedFile = async ({ buffer, originalname, subfolder }) => {
  // Production Cloud Storage Hook
  if (config.nodeEnv === 'production') {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: `algoprep/${subfolder}` },
        (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        }
      );
      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }

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
    if (config.nodeEnv === 'production' && filePath.includes('cloudinary')) {
      try {
        const parts = filePath.split('/');
        const filename = parts.pop().split('.')[0];
        const folder1 = parts.pop();
        const folder2 = parts.pop();
        if (folder2 === 'algoprep') {
          const public_id = `${folder2}/${folder1}/${filename}`;
          await cloudinary.uploader.destroy(public_id);
        }
      } catch (err) {
        console.error('Failed to delete from Cloudinary:', err);
      }
    }
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
