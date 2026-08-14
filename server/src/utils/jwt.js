import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export const generateAccessToken = (payload) => {
  return jwt.sign(payload, config.jwtAccessSecret, { expiresIn: '15m' });
};

export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: '7d' });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, config.jwtAccessSecret);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, config.jwtRefreshSecret);
};
