import { ZodError } from 'zod';

export const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        res.status(400).json({ error: `Validation error: ${issues}`, details: error.errors });
        return;
      }
      res.status(400).json({ error: 'Invalid request body' });
    }
  };
};
