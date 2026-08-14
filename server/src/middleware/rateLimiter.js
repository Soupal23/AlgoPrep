const userRequestStore = new Map();

// Clean up stale window entries periodically
setInterval(() => {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  for (const [userId, timestamps] of userRequestStore.entries()) {
    const validTimestamps = timestamps.filter(ts => now - ts < ONE_HOUR);
    if (validTimestamps.length === 0) {
      userRequestStore.delete(userId);
    } else {
      userRequestStore.set(userId, validTimestamps);
    }
  }
}, 10 * 60 * 1000); // Clean every 10 minutes

export const rateLimiterByUser = (maxRequests = 5, windowMs = 60 * 60 * 1000) => {
  return (req, res, next) => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User authentication required for rate limiting.' });
      return;
    }

    const now = Date.now();
    const timestamps = userRequestStore.get(userId) || [];

    // Filter requests within current time window
    const windowTimestamps = timestamps.filter(ts => now - ts < windowMs);

    if (windowTimestamps.length >= maxRequests) {
      const oldestRequest = windowTimestamps[0];
      const resetTimeMs = windowMs - (now - oldestRequest);
      const resetMinutes = Math.ceil(resetTimeMs / 60000);

      res.status(429).json({
        error: `Rate limit exceeded: You have reached the maximum allowed ${maxRequests} AI test generations per hour per user.`,
        retryAfterMinutes: resetMinutes
      });
      return;
    }

    windowTimestamps.push(now);
    userRequestStore.set(userId, windowTimestamps);
    next();
  };
};

export const resetUserRateLimit = (userId) => {
  userRequestStore.delete(userId);
};
