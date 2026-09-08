import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';

export type MediaActivityType = 'video-shoot' | 'video-out';

export interface IMediaActivity {
  id: string;
  userId: string;
  employeeId?: string;
  employeeName?: string;
  department: 'media';
  activityType: MediaActivityType;
  date: string;
  totalVideos: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

class MediaActivityModel implements IMediaActivity {
  id: string;
  userId: string;
  employeeId?: string;
  employeeName?: string;
  department: 'media';
  activityType: MediaActivityType;
  date: string;
  totalVideos: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = String(data.id || uuidv4());
    this.userId = String(data.userId);
    this.employeeId = data.employeeId ? String(data.employeeId) : undefined;
    this.employeeName = data.employeeName ? String(data.employeeName) : undefined;
    this.department = 'media';
    this.activityType = data.activityType === 'video-out' ? 'video-out' : 'video-shoot';
    this.date = String(data.date);
    this.totalVideos = Number(data.totalVideos) || 0;
    this.notes = data.notes ? String(data.notes) : undefined;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }
}

export interface MediaActivityFilter {
  activityType: MediaActivityType;
  startDate?: string;
  endDate?: string;
  date?: string;
}

export const MediaActivity = {
  async create(data: Omit<IMediaActivity, 'id' | 'createdAt' | 'updatedAt'>): Promise<IMediaActivity> {
    const item = new MediaActivityModel(data);
    await query(
      `INSERT INTO media_activities
       (id, userId, employeeId, employeeName, department, activityType, date, totalVideos, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 'media', ?, ?, ?, ?, NOW(), NOW())`,
      [item.id, item.userId, item.employeeId || null, item.employeeName || null, item.activityType, item.date, item.totalVideos, item.notes || null]
    );
    return item;
  },

  async findFiltered(filter: MediaActivityFilter): Promise<IMediaActivity[]> {
    const conditions = ['activityType = ?'];
    const params: any[] = [filter.activityType];
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
    const rows = await query<any[]>(
      `SELECT * FROM media_activities WHERE ${conditions.join(' AND ')} ORDER BY date DESC, createdAt DESC`,
      params
    );
    return rows.map((row) => new MediaActivityModel(row));
  },

  async getSummary(filter: MediaActivityFilter): Promise<{ totalVideos: number; totalRecords: number }> {
    const conditions = ['activityType = ?'];
    const params: any[] = [filter.activityType];
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
    const rows = await query<any[]>(
      `SELECT COALESCE(SUM(totalVideos), 0) AS totalVideos, COUNT(*) AS totalRecords
       FROM media_activities WHERE ${conditions.join(' AND ')}`,
      params
    );
    return { totalVideos: Number(rows[0]?.totalVideos) || 0, totalRecords: Number(rows[0]?.totalRecords) || 0 };
  },
};