import { apiClient } from './client';

export type MediaActivityType = 'video-shoot' | 'video-out';

export interface MediaActivity {
  id: string;
  userId: string;
  employeeId?: string;
  employeeName?: string;
  department: 'media';
  activityType: MediaActivityType;
  date: string;
  totalVideos: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaActivityResponse {
  success: boolean;
  error?: string;
  message?: string;
  data?: { activity: MediaActivity };
}

export interface MediaActivitiesResponse {
  success: boolean;
  error?: string;
  data?: {
    activities: MediaActivity[];
    summary: { totalVideos: number; totalRecords: number };
  };
}

const endpoint = (type: MediaActivityType) => type === 'video-shoot' ? '/media/video-shoots' : '/media/video-out';

export const mediaApi = {
  async create(type: MediaActivityType, payload: { date: string; totalVideos: number; notes?: string }): Promise<MediaActivityResponse> {
    try {
      const response = await apiClient.post<MediaActivityResponse>(endpoint(type), payload);
      return response.data;
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || 'Failed to save media activity.' };
    }
  },

  async list(type: MediaActivityType, params?: { date?: string; startDate?: string; endDate?: string }): Promise<MediaActivitiesResponse> {
    try {
      const response = await apiClient.get<MediaActivitiesResponse>(endpoint(type), { params });
      return response.data;
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || 'Failed to load media activity.' };
    }
  },
};