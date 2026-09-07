import jwt from 'jsonwebtoken';
import { UserPayload } from '../types/index.js';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const getJwtSecret = (): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.');
  }
  return jwtSecret;
};

export const assertJwtConfiguration = (): void => {
  getJwtSecret();
};

export const generateToken = (payload: UserPayload): string => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN as any,
  });
};

export const verifyToken = (token: string): UserPayload => {
  return jwt.verify(token, getJwtSecret()) as UserPayload;
};
