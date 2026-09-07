import { apiClient } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TopPerformer {
  userId: string;
  fullName: string;
  employeeId: string;
  department: string;
  avatarUrl?: string;
  totalSales: number;
}

export interface EarlyCheckoutItem {
  id: string;
  userId: string;
  fullName: string;
  employeeId: string;
  department: string;
  avatarUrl?: string;
  checkInTime?: string | null;
  checkOutTime: string;
  checkOutTimeFormatted: string;
  reason: string;
  workDurationMinutes?: number;
}

export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  totalMonthlySales: number;
  totalMonthlyWhatsappEnquiries: number;
  totalMonthlyTotalOrders: number;
  totalMonthlyCompletedOrders: number;
  totalMonthlyCancelledOrders: number;
  totalMonthlyCodOrders: number;
  totalMonthlyPrepaidOrders: number;
  currentMonth: string;
  currentYear: number;
  topPerformers: TopPerformer[];
  earlyCheckouts?: EarlyCheckoutItem[];
}

export interface DashboardResponse {
  success: boolean;
  error?: string;
  data?: DashboardStats;
}

export interface AdminEmployee {
  id: string;
  fullName: string;
  employeeId: string;
  email: string;
  department: string;
  phone: string;
  age?: number | null;
  joiningDate: string;
  role: string;
  avatarUrl?: string;
  todayStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';
  selfieUrl?: string | null;
  isVerified?: boolean;
  earlyCheckoutReason?: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
}

export interface EmployeesResponse {
  success: boolean;
  error?: string;
  data?: {
    employees: AdminEmployee[];
    totalCount: number;
  };
}

export interface EmployeeSales {
  userId: string;
  fullName: string;
  employeeId: string;
  department: string;
  avatarUrl?: string;
  totalSales: number;
  totalWhatsappEnquiries: number;
  totalOrders: number;
  totalCompletedOrders: number;
  totalCancelledOrders: number;
  totalCodOrders: number;
  totalPrepaidOrders: number;
  reportCount: number;
}

export interface AdminReportsSummary {
  totalSales: number;
  totalWhatsappEnquiries: number;
  totalOrders: number;
  totalCompletedOrders: number;
  totalCancelledOrders: number;
  totalCodOrders: number;
  totalPrepaidOrders: number;
  totalReports: number;
  month: string;
  year: number;
}

export interface AdminReportItem {
  id: string;
  userId: string;
  date: string;
  totalSalesAmount: number;
  whatsappEnquiries: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  codOrders: number;
  prepaidOrders: number;
  createdAt: string;
}

export interface AdminReportsResponse {
  success: boolean;
  error?: string;
  data?: {
    reports: AdminReportItem[];
    salesByEmployee: EmployeeSales[];
    summary: AdminReportsSummary;
  };
}

export interface AdminNotificationItem {
  id: string;
  title: string;
  message: string;
  type?: 'broadcast' | 'announcement' | 'direct' | 'alert';
  targetType: 'all' | 'department' | 'employee';
  targetId?: string;
  targetLabel: string;
  priority: 'normal' | 'high' | 'urgent';
  senderName?: string;
  createdAt: string;
  readCount?: number;
}

export interface SendNotificationPayload {
  targetType: 'all' | 'department' | 'employee';
  targetId?: string;
  targetLabel?: string;
  title: string;
  message: string;
  priority: 'normal' | 'high' | 'urgent';
  type?: 'broadcast' | 'announcement' | 'direct' | 'alert';
}

export interface NotificationsResponse {
  success: boolean;
  error?: string;
  data?: AdminNotificationItem[];
}

export interface CreateEmployeePayload {
  fullName: string;
  employeeId: string;
  email: string;
  password?: string;
  department?: string;
  phone?: string;
  age?: number;
  joiningDate?: string;
  avatarUrl?: string;
}

export interface UpdateEmployeePayload {
  fullName?: string;
  employeeId?: string;
  email?: string;
  department?: string;
  phone?: string;
  age?: number;
  joiningDate?: string;
  avatarUrl?: string;
}

// ─── Dynamic API functions ───────────────────────────────────────────────────

export const adminApi = {
  getDashboard: async (): Promise<DashboardResponse> => {
    try {
      const response = await apiClient.get<DashboardResponse>('/admin/dashboard');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to load dashboard metrics',
      };
    }
  },

  getEmployees: async (): Promise<EmployeesResponse> => {
    try {
      const response = await apiClient.get<EmployeesResponse>('/admin/employees');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to load employee directory',
      };
    }
  },

  createEmployee: async (payload: CreateEmployeePayload): Promise<{ success: boolean; data?: AdminEmployee; error?: string }> => {
    try {
      const response = await apiClient.post('/admin/employees', payload);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to create employee',
      };
    }
  },

  updateEmployee: async (id: string, payload: UpdateEmployeePayload): Promise<{ success: boolean; data?: AdminEmployee; error?: string }> => {
    try {
      const response = await apiClient.put(`/admin/employees/${id}`, payload);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to update employee',
      };
    }
  },

  deleteEmployee: async (id: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const response = await apiClient.delete(`/admin/employees/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to delete employee',
      };
    }
  },

  getReports: async (month?: number, year?: number): Promise<AdminReportsResponse> => {
    try {
      const response = await apiClient.get<AdminReportsResponse>('/admin/reports', {
        params: { month, year },
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to load reports',
      };
    }
  },

  sendNotification: async (payload: SendNotificationPayload): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const response = await apiClient.post('/admin/notifications', payload);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to send notification',
      };
    }
  },

  getNotifications: async (): Promise<NotificationsResponse> => {
    try {
      const response = await apiClient.get<NotificationsResponse>('/admin/notifications');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to load notifications',
      };
    }
  },

  deleteNotification: async (id: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const response = await apiClient.delete(`/admin/notifications/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to delete notification',
      };
    }
  },

  downloadReport: async (
    period: 'daily' | 'monthly' | 'yearly',
    format: 'pdf' | 'excel',
    params: { date?: string; month?: number; year?: number }
  ): Promise<{ success: boolean; data?: string; filename?: string; mimeType?: string; error?: string }> => {
    try {
      const response = await apiClient.get('/admin/reports/export', {
        params: { period, format, ...params },
        responseType: 'arraybuffer',
      });

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'] || '';
      const filenameMatch = contentDisposition.match(/filename="?([^";\s]+)"?/);
      const filename = filenameMatch
        ? filenameMatch[1]
        : `KLTrends_Reports.${format === 'excel' ? 'xlsx' : 'pdf'}`;

      // Convert arraybuffer to base64 string for expo-file-system
      const uint8Array = new Uint8Array(response.data as ArrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64Data = btoa(binary);

      const mimeType =
        format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf';

      return { success: true, data: base64Data, filename, mimeType };
    } catch (error: any) {
      // If the error response is arraybuffer, try to parse it as JSON
      if (error.response?.data instanceof ArrayBuffer) {
        try {
          const decoder = new TextDecoder('utf-8');
          const jsonStr = decoder.decode(new Uint8Array(error.response.data));
          const parsed = JSON.parse(jsonStr);
          return { success: false, error: parsed.error || 'Failed to download report' };
        } catch {
          // fall through
        }
      }
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to download report',
      };
    }
  },
};
