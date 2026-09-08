import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';

export type PackingOrderSource = 'kltrends' | 'klindia';

export interface IPackingRecord {
  id: string;
  userId: string;
  employeeId?: string;
  employeeName?: string;
  department: 'packaging';
  date: string;
  orderSource: PackingOrderSource;
  ordersPacked: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

class PackingRecordModel implements IPackingRecord {
  id: string;
  userId: string;
  employeeId?: string;
  employeeName?: string;
  department: 'packaging' = 'packaging';
  date: string;
  orderSource: PackingOrderSource;
  ordersPacked: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = String(data.id || uuidv4());
    this.userId = String(data.userId);
    this.employeeId = data.employeeId ? String(data.employeeId) : undefined;
    this.employeeName = data.employeeName ? String(data.employeeName) : undefined;
    this.date = String(data.date);
    this.orderSource = data.orderSource === 'klindia' ? 'klindia' : 'kltrends';
    this.ordersPacked = Number(data.ordersPacked) || 0;
    this.notes = data.notes ? String(data.notes) : undefined;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }
}

export interface PackingRecordFilter {
  userId?: string;
  orderSource?: PackingOrderSource | 'all';
  date?: string;
  startDate?: string;
  endDate?: string;
}

const filterSql = (filter: PackingRecordFilter) => {
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
  return { where: conditions.length > 0 ? conditions.join(' AND ') : '1 = 1', params };
};

export const PackingRecord = {
  async create(data: Omit<IPackingRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<IPackingRecord> {
    const item = new PackingRecordModel(data);
    await query(
      `INSERT INTO packing_records
       (id, userId, employeeId, employeeName, department, date, orderSource, ordersPacked, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 'packaging', ?, ?, ?, ?, NOW(), NOW())`,
      [item.id, item.userId, item.employeeId || null, item.employeeName || null, item.date, item.orderSource, item.ordersPacked, item.notes || null]
    );
    return item;
  },

  async findFiltered(filter: PackingRecordFilter): Promise<IPackingRecord[]> {
    const { where, params } = filterSql(filter);
    const rows = await query<any[]>(`SELECT * FROM packing_records WHERE ${where} ORDER BY date DESC, createdAt DESC`, params);
    return rows.map((row) => new PackingRecordModel(row));
  },

  async getSummary(filter: PackingRecordFilter): Promise<{ kltrendsTotal: number; klindiaTotal: number; totalOrders: number; totalRecords: number }> {
    const { where, params } = filterSql(filter);
    const rows = await query<any[]>(
      `SELECT
         COALESCE(SUM(CASE WHEN orderSource = 'kltrends' THEN ordersPacked ELSE 0 END), 0) AS kltrendsTotal,
         COALESCE(SUM(CASE WHEN orderSource = 'klindia' THEN ordersPacked ELSE 0 END), 0) AS klindiaTotal,
         COALESCE(SUM(ordersPacked), 0) AS totalOrders,
         COUNT(*) AS totalRecords
       FROM packing_records WHERE ${where}`,
      params
    );
    const row = rows[0] || {};
    return {
      kltrendsTotal: Number(row.kltrendsTotal) || 0,
      klindiaTotal: Number(row.klindiaTotal) || 0,
      totalOrders: Number(row.totalOrders) || 0,
      totalRecords: Number(row.totalRecords) || 0,
    };
  },
};