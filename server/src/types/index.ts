import { Request } from 'express';

export interface UserPayload {
  userId: string;
  email: string;
  role: 'admin' | 'employee' | 'manager';
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
