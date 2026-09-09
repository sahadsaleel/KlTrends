import { apiClient } from './client';

export interface AttendanceRecord {
  id?: string;
  userId?: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  workDurationMinutes: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';
  shiftStartTime: string;
  shiftEndTime: string;
  selfieUrl?: string;
  selfiePublicId?: string;
  isVerified?: boolean;
  location?: string;
  notes?: string;
  lateCheckInReason?: string;
  earlyCheckoutReason?: string;
}

export interface ActivityItem {
  id: string;
  date: string;
  dayName: string;
  rawDate: string;
  checkInTimeStr: string;
  checkOutTimeStr: string;
  timeRange: string;
  durationText: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';
  selfieUrl?: string;
  lateCheckInReason?: string;
  earlyCheckoutReason?: string;
}

export interface AttendanceStats {
  hoursThisWeek: number;
  targetWeeklyHours: number;
  daysPresent: number;
  totalWorkingDays: number;
}

export interface MonthlyAttendanceResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    stats: AttendanceStats;
    records: AttendanceRecord[];
    recentActivity: ActivityItem[];
  };
}

export interface TodayStatusResponse {
  success: boolean;
  error?: string;
  data?: {
    serverTime: string;
    todayDateStr: string;
    attendance: AttendanceRecord | null;
  };
}

export interface CheckInPayload {
  selfieImage?: string;
  location?: string;
  notes?: string;
  lateCheckInReason?: string;
}

export interface CheckOutPayload {
  earlyCheckoutReason?: string;
  reason?: string;
}

export const attendanceApi = {
  checkIn: async (payload?: CheckInPayload) => {
    try {
      const response = await apiClient.post('/attendance/check-in', payload || {}, {
        timeout: 45000, // 45s for selfie upload
      });
      return response.data;
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        (error.code === 'ECONNABORTED'
          ? 'Check-in request timed out. Please check your internet connection and try again.'
          : error.message || 'Failed to check in.');
      return {
        success: false,
        error: errorMsg,
      };
    }
  },

  checkOut: async (payload?: CheckOutPayload) => {
    try {
      const response = await apiClient.post('/attendance/check-out', payload || {});
      return response.data;
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to check out.';
      return {
        success: false,
        error: errorMsg,
      };
    }
  },

  getTodayStatus: async (): Promise<TodayStatusResponse> => {
    try {
      const response = await apiClient.get<TodayStatusResponse>('/attendance/today');
      return response.data;
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to load today status.';
      return {
        success: false,
        error: errorMsg,
      };
    }
  },

  getMonthlyAttendance: async (month?: number, year?: number): Promise<MonthlyAttendanceResponse> => {
    try {
      const response = await apiClient.get<MonthlyAttendanceResponse>('/attendance/monthly', {
        params: { month, year },
      });
      return response.data;
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch monthly attendance.';
      return {
        success: false,
        error: errorMsg,
      };
    }
  },
};
