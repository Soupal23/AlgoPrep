import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimetypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

  const hasValidMime = allowedMimetypes.includes(file.mimetype);
  const hasValidExt = allowedExtensions.some((ext) => file.originalname.toLowerCase().endsWith(ext));

  if (hasValidMime || hasValidExt) {
    cb(null, true);
  } else {
    const error = new Error('Invalid avatar image type. Only JPG, PNG, WEBP, and GIF images up to 2MB are allowed.');
    error.statusCode = 400;
    cb(error, false);
  }
};

export const uploadAvatar = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter
});
