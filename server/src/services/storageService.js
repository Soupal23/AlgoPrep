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
  const hasCloudinary = Boolean(
    config.cloudinaryCloudName &&
    config.cloudinaryApiKey &&
    config.cloudinaryApiSecret
  );

  // Optional Cloudinary Upload (only when all keys are explicitly configured)
  if (hasCloudinary) {
    try {
      const cloudUrl = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `algoprep/${subfolder}`,
            resource_type: 'auto',
            use_filename: true,
            unique_filename: true
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
          }
        );
        streamifier.createReadStream(buffer).pipe(uploadStream);
      });
      return cloudUrl;
    } catch (cloudErr) {
      console.warn('Cloudinary upload failed, falling back to local disk storage:', cloudErr.message);
    }
  }

  // Local Disk Storage (Default & Fail-Safe)
  const safeFilename = `${Date.now()}-${originalname.replace(/\s+/g, '_')}`;
  const targetDir = path.resolve('uploads', subfolder);

  await fs.mkdir(targetDir, { recursive: true });
  const targetPath = path.join(targetDir, safeFilename);

  await fs.writeFile(targetPath, buffer);

  // Return normalized path for server storage
  return `uploads/${subfolder}/${safeFilename}`;
};

export const deleteUploadedFile = async (filePath) => {
  if (!filePath || filePath.startsWith('http://') || filePath.startsWith('https://')) {
    if (config.nodeEnv === 'production' && filePath.includes('cloudinary')) {
      try {
        const parts = filePath.split('/');
        const filenameWithExt = parts.pop();
        const filename = filenameWithExt.split('.')[0];
        const folder1 = parts.pop();
        const folder2 = parts.pop();
        if (folder2 === 'algoprep') {
          const publicId = `${folder2}/${folder1}/${filename}`;
          // Try destroying as image first, fallback to raw if not found
          const res = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
          if (res?.result === 'not found') {
            await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
          }
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
