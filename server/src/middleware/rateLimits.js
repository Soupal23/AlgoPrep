import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { verifyAccessToken } from '../utils/jwt.js';

/**
 * Tiered rate limiting.
 *
 * - generalLimiter: generous budget for all /api traffic, keyed per user (IP fallback).
 * - authLimiter / refreshLimiter: strict, keyed per IP to slow down brute force.
 * - attemptSaveLimiter / attemptSubmitLimiter: dedicated per-user budgets so that
 *   exam autosave/submit can never be starved by other API usage.
 *
 * All limits are configurable via environment variables. Under NODE_ENV=test the
 * defaults are effectively unlimited so unrelated test suites are not affected.
 */

const isTest = process.env.NODE_ENV === 'test';
const UNLIMITED = 1_000_000;

const envInt = (name, fallback) => {
  const raw = process.env[name];
  const parsed = raw !== undefined && raw !== '' ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return isTest ? UNLIMITED : fallback;
};

const MINUTE = 60 * 1000;

// ---------- Key helpers ----------

export const ipKey = (req) => `ip:${ipKeyGenerator(req.ip || '')}`;

const extractUserId = (req) => {
  if (req.user?.userId) return req.user.userId;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const payload = verifyAccessToken(authHeader.split(' ')[1]);
      if (payload?.userId) return payload.userId;
    } catch {
      // Invalid/expired token: fall back to IP keying.
    }
  }
  return null;
};

export const userOrIpKey = (req) => {
  const userId = extractUserId(req);
  return userId ? `user:${userId}` : ipKey(req);
};

const userKey = (req) => {
  const userId = req.user?.userId;
  return userId ? `user:${userId}` : ipKey(req);
};

// ---------- Shared handler ----------

const buildHandler = (errorMessage) => (req, res, _next, options) => {
  const resetTime = req.rateLimit?.resetTime;
  const retryAfterSeconds = resetTime
    ? Math.max(1, Math.ceil((new Date(resetTime).getTime() - Date.now()) / 1000))
    : Math.ceil(options.windowMs / 1000);

  res.status(options.statusCode).json({
    error: errorMessage,
    retryAfterSeconds
  });
};

const createLimiter = ({ windowMs, limit, keyGenerator, skip, errorMessage }) =>
  rateLimit({
    windowMs,
    limit,
    keyGenerator,
    skip,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: buildHandler(errorMessage)
  });

// ---------- Paths with dedicated limiters (relative to the /api mount) ----------

const PROGRESS_PATH = /^\/attempts\/[^/]+\/progress\/?$/;
const SUBMIT_PATH = /^\/attempts\/[^/]+\/submit\/?$/;
const AUTH_LIMITED_PATH = /^\/auth\/(login|signup|refresh)\/?$/;

const skipGeneral = (req) => {
  const path = req.path;
  if (path === '/health') return true;
  if (AUTH_LIMITED_PATH.test(path)) return true;
  if (req.method === 'PATCH' && PROGRESS_PATH.test(path)) return true;
  if (req.method === 'POST' && SUBMIT_PATH.test(path)) return true;
  return false;
};

// ---------- Limiters ----------

export const generalLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: envInt('RATE_LIMIT_GENERAL_MAX', 1000),
  keyGenerator: userOrIpKey,
  skip: skipGeneral,
  errorMessage: 'Too many requests, please slow down and try again shortly.'
});

export const authLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: envInt('RATE_LIMIT_AUTH_MAX', 20),
  keyGenerator: ipKey,
  errorMessage: 'Too many authentication attempts. Please try again later.'
});

export const refreshLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: envInt('RATE_LIMIT_REFRESH_MAX', 60),
  keyGenerator: ipKey,
  errorMessage: 'Too many session refresh attempts. Please try again later.'
});

export const attemptSaveLimiter = createLimiter({
  windowMs: MINUTE,
  limit: envInt('RATE_LIMIT_SAVE_PER_MIN', 60),
  keyGenerator: userKey,
  errorMessage: 'Saving too frequently. Your progress will be retried shortly.'
});

export const attemptSubmitLimiter = createLimiter({
  windowMs: MINUTE,
  limit: envInt('RATE_LIMIT_SUBMIT_PER_MIN', 10),
  keyGenerator: userKey,
  errorMessage: 'Too many submission attempts. Please wait a moment and try again.'
});
