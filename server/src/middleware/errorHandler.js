export const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Error:', err);

  if (err.name === 'MulterError') {
    res.status(400).json({ error: `File upload error: ${err.message}` });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
