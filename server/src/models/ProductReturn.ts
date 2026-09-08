import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';

export type OrderSource = 'kltrends' | 'klindia';

export interface IProductReturn {
  id: string;
  userId: string;
  employeeId?: string;
  employeeName?: string;
  department: string;
  date: string;
  orderSource: OrderSource;
  returnQuantity: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ProductReturnModel implements IProductReturn {
  id: string;
  userId: string;
  employeeId?: string;
  employeeName?: string;
  department: string;
  date: string;
  orderSource: OrderSource;
  returnQuantity: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = String(data.id || uuidv4());
    this.userId = String(data.userId);
    this.employeeId = data.employeeId ? String(data.employeeId) : undefined;
    this.employeeName = data.employeeName ? String(data.employeeName) : undefined;
    this.department = String(data.department || 'manager');
    this.date = String(data.date);
    this.orderSource = data.orderSource === 'klindia' ? 'klindia' : 'kltrends';
    this.returnQuantity = Number(data.returnQuantity) || 0;
    this.notes = data.notes ? String(data.notes) : undefined;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }
}

export interface ProductReturnFilter {
  orderSource?: OrderSource | 'all';
  startDate?: string;
  endDate?: string;
  date?: string;
  userId?: string;
}

export const ProductReturn = {
  async create(data: {
    userId: string;
    employeeId?: string;
    employeeName?: string;
    department?: string;
    date: string;
    orderSource: OrderSource;
    returnQuantity: number;
    notes?: string;
  }): Promise<IProductReturn> {
    const item = new ProductReturnModel(data);
    await query(
      `INSERT INTO product_returns (id, userId, employeeId, employeeName, department, date, orderSource, returnQuantity, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        item.id,
        item.userId,
        item.employeeId || null,
        item.employeeName || null,
        item.department || 'manager',
        item.date,
        item.orderSource,
        item.returnQuantity,
        item.notes || null,
      ]
    );
    return item;
  },

  async findFiltered(filter: ProductReturnFilter = {}): Promise<IProductReturn[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.userId) {
      conditions.push('userId = ?');
      params.push(filter.userId);
    }

    if (filter.orderSource && filter.orderSource !== 'all') {
      conditions.push('orderSource = ?');
      params.push(filter.orderSource);
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
      `SELECT * FROM product_returns ${whereClause} ORDER BY date DESC, createdAt DESC`,
      params
    );

    return rows.map((r) => new ProductReturnModel(r));
  },

  async findById(id: string): Promise<IProductReturn | null> {
    const rows = await query<any[]>('SELECT * FROM product_returns WHERE id = ? LIMIT 1', [id]);
    return rows.length ? new ProductReturnModel(rows[0]) : null;
  },

  async getSummary(filter: ProductReturnFilter = {}): Promise<{
    totalReturns: number;
    kltrendsCount: number;
    klindiaCount: number;
    totalRecords: number;
  }> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.userId) {
      conditions.push('userId = ?');
      params.push(filter.userId);
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
         COALESCE(SUM(returnQuantity), 0) AS totalReturns,
         COALESCE(SUM(CASE WHEN orderSource = 'kltrends' THEN returnQuantity ELSE 0 END), 0) AS kltrendsCount,
         COALESCE(SUM(CASE WHEN orderSource = 'klindia' THEN returnQuantity ELSE 0 END), 0) AS klindiaCount,
         COUNT(*) AS totalRecords
       FROM product_returns ${whereClause}`,
      params
    );

    const row = rows[0] || {};
    return {
      totalReturns: Number(row.totalReturns) || 0,
      kltrendsCount: Number(row.kltrendsCount) || 0,
      klindiaCount: Number(row.klindiaCount) || 0,
      totalRecords: Number(row.totalRecords) || 0,
    };
  },
};
