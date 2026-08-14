import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimetypes = ['application/pdf', 'text/plain'];
  const allowedExtensions = ['.pdf', '.txt'];

  const hasValidMime = allowedMimetypes.includes(file.mimetype);
  const hasValidExt = allowedExtensions.some(ext => file.originalname.toLowerCase().endsWith(ext));

  if (hasValidMime || hasValidExt) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only PDF (.pdf) and Text (.txt) files up to 5MB are allowed.');
    error.statusCode = 400;
    cb(error, false);
  }
};

export const uploadSyllabus = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter
});
