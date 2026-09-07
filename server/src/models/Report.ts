import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';

export interface IReport {
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
  createdAt: Date;
  updatedAt: Date;
}

export class ReportModel implements IReport {
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
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = String(data.id || uuidv4());
    this.userId = String(data.userId);
    this.date = String(data.date);
    this.totalSalesAmount = Number(data.totalSalesAmount) || 0;
    this.whatsappEnquiries = Number(data.whatsappEnquiries) || 0;
    this.codOrders = Number(data.codOrders) || 0;
    this.prepaidOrders = Number(data.prepaidOrders) || 0;
    this.totalOrders = data.totalOrders !== undefined && data.totalOrders !== null
      ? Number(data.totalOrders)
      : this.codOrders + this.prepaidOrders;
    this.completedOrders = Number(data.completedOrders) || 0;
    this.cancelledOrders = Number(data.cancelledOrders) || 0;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }
}

const fromRows = (rows: any[]): IReport[] => rows.map((row) => new ReportModel(row));

export const Report = {
  async findInDateRange(startDate: string, endDate: string, userId?: string): Promise<IReport[]> {
    const conditions = ['date BETWEEN ? AND ?'];
    const params: string[] = [startDate, endDate];
    if (userId) {
      conditions.push('userId = ?');
      params.push(userId);
    }
    const rows = await query<any[]>(`SELECT * FROM reports WHERE ${conditions.join(' AND ')} ORDER BY date DESC`, params);
    return fromRows(rows);
  },

  async findByIdForUser(id: string, userId: string): Promise<IReport | null> {
    const rows = await query<any[]>('SELECT * FROM reports WHERE id = ? AND userId = ? LIMIT 1', [id, userId]);
    return rows.length ? new ReportModel(rows[0]) : null;
  },

  async findByUserAndDate(userId: string, date: string): Promise<IReport | null> {
    const rows = await query<any[]>('SELECT * FROM reports WHERE userId = ? AND date = ? LIMIT 1', [userId, date]);
    return rows.length ? new ReportModel(rows[0]) : null;
  },

  async create(data: Omit<IReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<IReport> {
    const report = new ReportModel({ ...data, id: uuidv4() });
    await query(
      `INSERT INTO reports (id, userId, date, totalSalesAmount, whatsappEnquiries, totalOrders, completedOrders, cancelledOrders, codOrders, prepaidOrders, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        report.id,
        report.userId,
        report.date,
        report.totalSalesAmount,
        report.whatsappEnquiries,
        report.totalOrders,
        report.completedOrders,
        report.cancelledOrders,
        report.codOrders,
        report.prepaidOrders,
      ]
    );
    return report;
  },

  async updateForUser(
    id: string,
    userId: string,
    values: Partial<Pick<IReport, 'date' | 'totalSalesAmount' | 'whatsappEnquiries' | 'totalOrders' | 'completedOrders' | 'cancelledOrders' | 'codOrders' | 'prepaidOrders'>>
  ): Promise<IReport | null> {
    const existing = await Report.findByIdForUser(id, userId);
    if (!existing) return null;
    const updated = new ReportModel({ ...existing, ...values });
    await query(
      `UPDATE reports SET date = ?, totalSalesAmount = ?, whatsappEnquiries = ?, totalOrders = ?, completedOrders = ?, cancelledOrders = ?, codOrders = ?, prepaidOrders = ?, updatedAt = NOW() WHERE id = ? AND userId = ?`,
      [
        updated.date,
        updated.totalSalesAmount,
        updated.whatsappEnquiries,
        updated.totalOrders,
        updated.completedOrders,
        updated.cancelledOrders,
        updated.codOrders,
        updated.prepaidOrders,
        id,
        userId,
      ]
    );
    return updated;
  },

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const result: any = await query('DELETE FROM reports WHERE id = ? AND userId = ?', [id, userId]);
    return result.affectedRows > 0;
  },

  async deleteByUser(userId: string): Promise<number> {
    const result: any = await query('DELETE FROM reports WHERE userId = ?', [userId]);
    return result.affectedRows || 0;
  },
};
