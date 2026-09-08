import { apiClient } from './client';

export type OrderSource = 'kltrends' | 'klindia';

export interface ProductReturn {
  id: string;
  userId: string;
  employeeId?: string;
  employeeName?: string;
  department: string;
  date: string;
  orderSource: OrderSource;
  returnQuantity: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductReturnSummary {
  totalReturns: number;
  kltrendsCount: number;
  klindiaCount: number;
  totalRecords: number;
}

export interface ProductReturnsListResponse {
  success: boolean;
  error?: string;
  data?: {
    returns: ProductReturn[];
    summary: ProductReturnSummary;
  };
}

export interface SingleProductReturnResponse {
  success: boolean;
  error?: string;
  message?: string;
  data?: {
    return: ProductReturn;
  };
}

export interface CreateProductReturnPayload {
  date: string; // YYYY-MM-DD
  orderSource: OrderSource;
  returnQuantity: number;
  notes?: string;
}

export interface DailyExpense {
  id: string;
  userId: string;
  employeeId?: string;
  employeeName?: string;
  department: string;
  date: string;
  category: string;
  customCategoryName?: string;
  amount: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseSummary {
  totalAmount: number;
  count: number;
  period: {
    startDate: string | null;
    endDate: string | null;
  };
}

export interface DailyExpensesListResponse {
  success: boolean;
  error?: string;
  data?: {
    expenses: DailyExpense[];
    summary: ExpenseSummary;
  };
}

export interface SingleDailyExpenseResponse {
  success: boolean;
  error?: string;
  message?: string;
  data?: {
    expense: DailyExpense;
  };
}

export interface CreateDailyExpensePayload {
  date: string; // YYYY-MM-DD
  category: string;
  customCategoryName?: string;
  amount: number;
  description?: string;
}

export const managerApi = {
  // Product Returns
  async getProductReturns(params?: {
    orderSource?: OrderSource | 'all';
    startDate?: string;
    endDate?: string;
    date?: string;
  }): Promise<ProductReturnsListResponse> {
    try {
      const response = await apiClient.get<ProductReturnsListResponse>(
        '/manager/product-returns',
        { params }
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to load product returns.',
      };
    }
  },

  async createProductReturn(
    payload: CreateProductReturnPayload
  ): Promise<SingleProductReturnResponse> {
    try {
      const response = await apiClient.post<SingleProductReturnResponse>(
        '/manager/product-returns',
        payload
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to save product return.',
      };
    }
  },

  // Daily Expenses
  async getDailyExpenses(params?: {
    category?: string;
    startDate?: string;
    endDate?: string;
    date?: string;
  }): Promise<DailyExpensesListResponse> {
    try {
      const response = await apiClient.get<DailyExpensesListResponse>(
        '/manager/daily-expenses',
        { params }
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to load daily expenses.',
      };
    }
  },

  async createDailyExpense(
    payload: CreateDailyExpensePayload
  ): Promise<SingleDailyExpenseResponse> {
    try {
      const response = await apiClient.post<SingleDailyExpenseResponse>(
        '/manager/daily-expenses',
        payload
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to save daily expense.',
      };
    }
  },
};
