import { apiClient } from './client';

export type NotificationPriority = 'normal' | 'high' | 'urgent';
export type NotificationType = 'broadcast' | 'announcement' | 'direct' | 'alert';
export type NotificationTargetType = 'all' | 'department' | 'employee';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type?: NotificationType;
  priority: NotificationPriority;
  targetType: NotificationTargetType;
  targetId?: string;
  targetLabel: string;
  senderName: string;
  createdAt: string;
  fullCreatedAt?: string;
  isRead: boolean;
  readAt?: string | null;
}

export interface EmployeeNotificationsResponse {
  success: boolean;
  error?: string;
  data?: NotificationItem[];
}

export interface UnreadCountResponse {
  success: boolean;
  error?: string;
  data?: { count: number };
}

export const notificationsApi = {
  /**
   * Fetch all notifications for the authenticated employee
   */
  getEmployeeNotifications: async (): Promise<EmployeeNotificationsResponse> => {
    try {
      const response = await apiClient.get<EmployeeNotificationsResponse>('/notifications');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch notifications',
      };
    }
  },

  /**
   * Fetch count of unread notifications
   */
  getUnreadCount: async (): Promise<number> => {
    try {
      const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
      if (response.data?.success && response.data.data) {
        return response.data.data.count;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  },

  /**
   * Mark a single notification as read
   */
  markAsRead: async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiClient.patch(`/notifications/${id}/read`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to mark notification as read',
      };
    }
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<{ success: boolean; error?: string; markedCount?: number }> => {
    try {
      const response = await apiClient.post('/notifications/mark-all-read');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to mark all as read',
      };
    }
  },
};
