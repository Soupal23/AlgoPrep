export const errorHandler = (err, req, res, next) => {
  // 1. Mongoose CastError (e.g. invalid ObjectId format)
  if (err.name === 'CastError') {
    res.status(400).json({
      error: `Invalid resource identifier format: ${err.value}`,
      code: 'INVALID_ID'
    });
    return;
  }

  // 2. Mongoose Schema Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    res.status(400).json({
      error: messages.length > 0 ? messages.join('; ') : 'Schema validation failed',
      code: 'VALIDATION_ERROR'
    });
    return;
  }

  // 3. Multer Upload Error
  if (err.name === 'MulterError') {
    res.status(400).json({
      error: `File upload error: ${err.message}`,
      code: 'UPLOAD_ERROR'
    });
    return;
  }

  // 4. Fallback Application & Server Errors
  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);
  const message = err.message || 'Internal server error';

  if (statusCode >= 500) {
    console.error('Server Internal Error:', err);
  }

  res.status(statusCode).json({
    error: message,
    code: err.code || 'SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
