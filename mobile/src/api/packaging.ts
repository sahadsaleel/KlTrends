import { apiClient } from './client';

export type PackingOrderSource = 'kltrends' | 'klindia';

export interface PackingRecord {
  id: string;
  userId: string;
  employeeId?: string;
  employeeName?: string;
  department: 'packaging';
  date: string;
  orderSource: PackingOrderSource;
  ordersPacked: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PackingResponse {
  success: boolean;
  error?: string;
  data?: { record: PackingRecord };
}

export interface PackingListResponse {
  success: boolean;
  error?: string;
  data?: {
    records: PackingRecord[];
    summary: { kltrendsTotal: number; klindiaTotal: number; totalOrders: number; totalRecords: number };
  };
}

export const packagingApi = {
  async create(payload: { date: string; orderSource: PackingOrderSource; ordersPacked: number; notes?: string }): Promise<PackingResponse> {
    try {
      const response = await apiClient.post<PackingResponse>('/packaging/packing-records', payload);
      return response.data;
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || 'Failed to save packing record.' };
    }
  },

  async list(params?: { orderSource?: PackingOrderSource | 'all'; date?: string; startDate?: string; endDate?: string }): Promise<PackingListResponse> {
    try {
      const response = await apiClient.get<PackingListResponse>('/packaging/packing-records', { params });
      return response.data;
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || 'Failed to load packing records.' };
    }
  },
};