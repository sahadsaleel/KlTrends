import { apiClient, setAuthToken } from './client';
import { API_CONFIG } from '../constants/config';
import { User } from '../types';
import { storage } from '../services/storage';

export interface AuthResponse {
  success: boolean;
  status?: number;
  message?: string;
  token?: string;
  user?: User;
  error?: string;
  email?: string;
  verifiedEmail?: string;
}

export interface SendOtpPayload {
  email?: string;
  identifier?: string;
  purpose: 'login' | 'register' | 'forgot-password' | 'reset-password' | string;
  role?: 'admin' | 'employee' | string;
  registrationData?: {
    username?: string;
    fullName?: string;
    password?: string;
    department?: string;
    phone?: string;
  };
}

export interface VerifyOtpPayload {
  email?: string;
  identifier?: string;
  otp: string;
  purpose?: 'login' | 'register' | 'forgot-password' | 'reset-password' | string;
  role?: 'admin' | 'employee' | string;
}

const formatApiError = (error: any, fallback: string): string => {
  if (!API_CONFIG.IS_CONFIGURED) {
    return 'This Android app has no production server address. Please install a build configured with the company API URL.';
  }
  if (error.code === 'ECONNABORTED' || (error.message && error.message.includes('timeout'))) {
    return 'Server request timed out. Please check your network connection or server status.';
  }
  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
    return 'Unable to connect to the server. Please verify your server is running and accessible.';
  }
  return error.response?.data?.error || error.message || fallback;
};

export const authApi = {
  // OTP Management (Registration verification & Forgot Password)
  sendOtp: async (payload: SendOtpPayload): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/send-otp', payload);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        status: error.response?.status,
        error: formatApiError(error, 'Failed to send verification code.'),
      };
    }
  },

  verifyOtp: async (payload: VerifyOtpPayload): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/verify-otp', payload);
      if (response.data.token) {
        setAuthToken(response.data.token);
      }
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        status: error.response?.status,
        error: formatApiError(error, 'Verification failed. Please check the code.'),
      };
    }
  },

  login: async (payload: {
    username: string;
    password: string;
  }): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', payload);
      if (response.data.token) {
        setAuthToken(response.data.token);
      }
      if (response.data.user) {
        response.data.user.role = 'admin';
      }
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        status: error.response?.status,
        error: formatApiError(error, 'Sign in failed.'),
      };
    }
  },

  // Employee Auth (Username / Password)
  employeeRegister: async (payload: {
    fullName: string;
    username?: string;
    email: string;
    password: string;
    department: string;
    phone?: string;
    otp?: string;
  }): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/employee/register', payload);
      if (response.data.token) {
        setAuthToken(response.data.token);
      }
      if (response.data.user) {
        response.data.user.role = 'employee';
      }
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        status: error.response?.status,
        error: formatApiError(error, 'Registration failed.'),
      };
    }
  },

  employeeLogin: async (payload: {
    identifier?: string;
    username?: string;
    email?: string;
    password: string;
  }): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/employee/login', payload);
      if (response.data.token) {
        setAuthToken(response.data.token);
      }
      if (response.data.user) {
        response.data.user.role = 'employee';
      }
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        status: error.response?.status,
        error: formatApiError(error, 'Sign in failed.'),
      };
    }
  },

  // Forgot & Reset Password
  forgotPassword: async (payload: { identifier: string }): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/forgot-password', payload);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        status: error.response?.status,
        error: formatApiError(error, 'Failed to initiate password reset.'),
      };
    }
  },

  verifyResetOtp: async (payload: { identifier: string; otp: string }): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/verify-reset-otp', payload);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        status: error.response?.status,
        error: formatApiError(error, 'Verification code is invalid.'),
      };
    }
  },

  resetPassword: async (payload: {
    identifier: string;
    otp: string;
    newPassword: string;
  }): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/reset-password', payload);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        status: error.response?.status,
        error: formatApiError(error, 'Failed to reset password.'),
      };
    }
  },

  // Profile
  getMe: async (): Promise<AuthResponse> => {
    try {
      const response = await apiClient.get<AuthResponse>('/auth/me');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        status: error.response?.status,
        error: formatApiError(error, 'Session expired'),
      };
    }
  },

  updateProfile: async (payload: {
    fullName?: string;
    username?: string;
    age?: number;
    email?: string;
    phone?: string;
    joiningDate?: string;
    avatarUrl?: string;
  }): Promise<AuthResponse> => {
    try {
      const response = await apiClient.put<AuthResponse>('/auth/profile', payload);
      if (response.data.success && response.data.user) {
        await storage.setUser(response.data.user);
      }
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        status: error.response?.status,
        error: formatApiError(error, 'Failed to update profile.'),
      };
    }
  },
};
