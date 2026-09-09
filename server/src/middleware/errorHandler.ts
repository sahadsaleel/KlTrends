import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/index.js';

export interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const databaseUnavailable = ['ETIMEDOUT', 'ECONNREFUSED', 'PROTOCOL_SEQUENCE_TIMEOUT', 'ER_LOCK_WAIT_TIMEOUT'].includes((err as any).code);
  const statusCode = err.statusCode || (databaseUnavailable ? 503 : 500);
  const message = databaseUnavailable
    ? 'Database is temporarily unavailable. Please try again in a moment.'
    : process.env.NODE_ENV === 'production'
      ? 'Internal server error.'
      : err.message || 'Internal Server Error';

  console.error(`[Error] ${req.method} ${req.url} - Status: ${statusCode} - ${message}`);

  const response: ApiResponse = {
    success: false,
    error: message,
  };

  res.status(statusCode).json(response);
};
