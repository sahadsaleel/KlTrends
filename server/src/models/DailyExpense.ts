import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';

export const EXPENSE_CATEGORIES = [
  'daily_expense',
  'post_office_kltrends',
  'post_office_klindia',
  'return_amount',
  'fuel',
  'custom',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number] | string;

export interface IDailyExpense {
  id: string;
  userId: string;
  employeeId?: string;
  employeeName?: string;
  department: string;
  date: string;
  category: ExpenseCategory;
  customCategoryName?: string;
  amount: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class DailyExpenseModel implements IDailyExpense {
  id: string;
  userId: string;
  employeeId?: string;
  employeeName?: string;
  department: string;
  date: string;
  category: ExpenseCategory;
  customCategoryName?: string;
  amount: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = String(data.id || uuidv4());
    this.userId = String(data.userId);
    this.employeeId = data.employeeId ? String(data.employeeId) : undefined;
    this.employeeName = data.employeeName ? String(data.employeeName) : undefined;
    this.department = String(data.department || 'manager');
    this.date = String(data.date);
    this.category = String(data.category);
    this.customCategoryName = data.customCategoryName ? String(data.customCategoryName) : undefined;
    this.amount = Number(data.amount) || 0;
    this.description = data.description ? String(data.description) : undefined;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }
}

export interface DailyExpenseFilter {
  category?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  userId?: string;
}

export const DailyExpense = {
  async create(data: {
    userId: string;
    employeeId?: string;
    employeeName?: string;
    department?: string;
    date: string;
    category: ExpenseCategory;
    customCategoryName?: string;
    amount: number;
    description?: string;
  }): Promise<IDailyExpense> {
    const item = new DailyExpenseModel(data);
    await query(
      `INSERT INTO daily_expenses (id, userId, employeeId, employeeName, department, date, category, customCategoryName, amount, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        item.id,
        item.userId,
        item.employeeId || null,
        item.employeeName || null,
        item.department || 'manager',
        item.date,
        item.category,
        item.customCategoryName || null,
        item.amount,
        item.description || null,
      ]
    );
    return item;
  },

  async findFiltered(filter: DailyExpenseFilter = {}): Promise<IDailyExpense[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.userId) {
      conditions.push('userId = ?');
      params.push(filter.userId);
    }

    if (filter.category && filter.category !== 'all') {
      conditions.push('category = ?');
      params.push(filter.category);
    }

    if (filter.date) {
      conditions.push('date = ?');
      params.push(filter.date);
    } else if (filter.startDate && filter.endDate) {
      conditions.push('date BETWEEN ? AND ?');
      params.push(filter.startDate, filter.endDate);
    } else if (filter.startDate) {
      conditions.push('date >= ?');
      params.push(filter.startDate);
    } else if (filter.endDate) {
      conditions.push('date <= ?');
      params.push(filter.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await query<any[]>(
      `SELECT * FROM daily_expenses ${whereClause} ORDER BY date DESC, createdAt DESC`,
      params
    );

    return rows.map((r) => new DailyExpenseModel(r));
  },

  async findById(id: string): Promise<IDailyExpense | null> {
    const rows = await query<any[]>('SELECT * FROM daily_expenses WHERE id = ? LIMIT 1', [id]);
    return rows.length ? new DailyExpenseModel(rows[0]) : null;
  },

  async getSummary(filter: DailyExpenseFilter = {}): Promise<{
    totalAmount: number;
    count: number;
  }> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.userId) {
      conditions.push('userId = ?');
      params.push(filter.userId);
    }

    if (filter.category && filter.category !== 'all') {
      conditions.push('category = ?');
      params.push(filter.category);
    }

    if (filter.date) {
      conditions.push('date = ?');
      params.push(filter.date);
    } else if (filter.startDate && filter.endDate) {
      conditions.push('date BETWEEN ? AND ?');
      params.push(filter.startDate, filter.endDate);
    } else if (filter.startDate) {
      conditions.push('date >= ?');
      params.push(filter.startDate);
    } else if (filter.endDate) {
      conditions.push('date <= ?');
      params.push(filter.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await query<any[]>(
      `SELECT
         COALESCE(SUM(amount), 0) AS totalAmount,
         COUNT(*) AS count
       FROM daily_expenses ${whereClause}`,
      params
    );

    const row = rows[0] || {};
    return {
      totalAmount: Number(row.totalAmount) || 0,
      count: Number(row.count) || 0,
    };
  },
};
