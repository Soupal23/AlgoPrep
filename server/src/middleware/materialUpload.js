import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.docx', '.pptx', '.txt', '.md'];
  const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    const error = new Error(
      `Invalid file type "${ext}". Allowed formats are: PDF (.pdf), Word (.docx), PowerPoint (.pptx), Markdown (.md), and Text (.txt).`
    );
    error.statusCode = 400;
    cb(error, false);
  }
};

export const uploadMaterialsMiddleware = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit per file
  },
  fileFilter
});
