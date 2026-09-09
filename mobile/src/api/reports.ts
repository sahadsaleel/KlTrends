import { apiClient } from './client';

export interface Report {
  id: string;
  userId: string;
  date: string;
  totalSalesAmount: number;
  whatsappEnquiries: number;
  totalOrders: number;
  codOrders: number;
  prepaidOrders: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReportSummary {
  totalSales: number;
  totalOrders: number;
  codOrders: number;
  prepaidOrders: number;
  whatsappEnquiries: number;
  percentChange: number;
  month: string;
  year: number;
}

export interface ReportsListResponse {
  success: boolean;
  error?: string;
  data?: { reports: Report[]; summary: ReportSummary };
}

export interface SingleReportResponse {
  success: boolean;
  error?: string;
  message?: string;
  data?: { report: Report; reportId?: string };
}

export interface ReportPayload {
  date: string;
  totalSalesAmount: number;
  whatsappEnquiries: number;
  codOrders: number;
  prepaidOrders: number;
  totalOrders?: number;
}

export const reportsApi = {
  async getAll(month?: number, year?: number): Promise<ReportsListResponse> {
    try {
      return (await apiClient.get<ReportsListResponse>('/reports', { params: { month, year } })).data;
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || 'Failed to fetch reports.' };
    }
  },
  async create(payload: ReportPayload): Promise<SingleReportResponse> {
    try {
      return (await apiClient.post<SingleReportResponse>('/reports', payload)).data;
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || 'Failed to create report.', data: error.response?.data?.data };
    }
  },
  async update(id: string, payload: ReportPayload): Promise<SingleReportResponse> {
    try {
      return (await apiClient.put<SingleReportResponse>(`/reports/${id}`, payload)).data;
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || 'Failed to update report.' };
    }
  },
};
