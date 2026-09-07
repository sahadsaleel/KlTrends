import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';

export interface IAttendance {
  id: string;
  userId: string;
  date: string;
  checkInTime?: Date;
  checkOutTime?: Date;
  workDurationMinutes: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';
  shiftStartTime: string;
  shiftEndTime: string;
  selfieUrl?: string;
  selfiePublicId?: string;
  isVerified?: boolean;
  location?: string;
  notes?: string;

  earlyCheckoutReason?: string | null;

  createdAt: Date;
  updatedAt: Date;
  save(): Promise<IAttendance>;
}

export class AttendanceModel implements IAttendance {
  id: string;
  userId: string;
  date: string;
  checkInTime?: Date;
  checkOutTime?: Date;
  workDurationMinutes: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';
  shiftStartTime: string;
  shiftEndTime: string;
  selfieUrl?: string;
  selfiePublicId?: string;
  isVerified?: boolean;
  location?: string;
  notes?: string;
  earlyCheckoutReason?: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = data.id || uuidv4();
    this.userId = String(data.userId);
    this.date = String(data.date);
    this.checkInTime = data.checkInTime ? new Date(data.checkInTime) : undefined;
    this.checkOutTime = data.checkOutTime ? new Date(data.checkOutTime) : undefined;
    this.workDurationMinutes = Number(data.workDurationMinutes) || 0;
    this.status = data.status || 'PRESENT';
    this.shiftStartTime = data.shiftStartTime || '10:00 AM';
    this.shiftEndTime = data.shiftEndTime || '05:30 PM';
    this.selfieUrl = data.selfieUrl || undefined;
    this.selfiePublicId = data.selfiePublicId || undefined;
    this.isVerified = Boolean(data.isVerified);
    this.location = data.location || undefined;
    this.notes = data.notes || undefined;
    this.earlyCheckoutReason = data.earlyCheckoutReason || null;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }

  async save(): Promise<IAttendance> {
    const existingRows = await query<any[]>(
      'SELECT id FROM attendances WHERE id = ? LIMIT 1',
      [this.id]
    );
    const existing = existingRows.length > 0;
    if (existing) {
      await query(
        `UPDATE attendances SET
          userId = ?, date = ?, checkInTime = ?, checkOutTime = ?,
          workDurationMinutes = ?, status = ?, shiftStartTime = ?, shiftEndTime = ?,
          selfieUrl = ?, selfiePublicId = ?, isVerified = ?, location = ?, notes = ?,
          earlyCheckoutReason = ?,
          updatedAt = NOW()
        WHERE id = ?`,
        [
          this.userId,
          this.date,
          this.checkInTime || null,
          this.checkOutTime || null,
          this.workDurationMinutes,
          this.status,
          this.shiftStartTime,
          this.shiftEndTime,
          this.selfieUrl || null,
          this.selfiePublicId || null,
          this.isVerified ? 1 : 0,
          this.location || null,
          this.notes || null,
          this.earlyCheckoutReason || null,
          this.id,
        ]
      );
    } else {
      await query(
        `INSERT INTO attendances (id, userId, date, checkInTime, checkOutTime, workDurationMinutes, status, shiftStartTime, shiftEndTime, selfieUrl, selfiePublicId, isVerified, location, notes, earlyCheckoutReason, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
          checkInTime = VALUES(checkInTime),
          checkOutTime = VALUES(checkOutTime),
          workDurationMinutes = VALUES(workDurationMinutes),
          status = VALUES(status),
          selfieUrl = VALUES(selfieUrl),
          selfiePublicId = VALUES(selfiePublicId),
          isVerified = VALUES(isVerified),
          location = VALUES(location),
          notes = VALUES(notes),
          earlyCheckoutReason = VALUES(earlyCheckoutReason),
          updatedAt = NOW()`,
        [
          this.id,
          this.userId,
          this.date,
          this.checkInTime || null,
          this.checkOutTime || null,
          this.workDurationMinutes,
          this.status,
          this.shiftStartTime,
          this.shiftEndTime,
          this.selfieUrl || null,
          this.selfiePublicId || null,
          this.isVerified ? 1 : 0,
          this.location || null,
          this.notes || null,
          this.earlyCheckoutReason || null,
        ]
      );
    }
    return this;
  }
}

export const Attendance = {
  async findByUserAndDate(userId: string, date: string): Promise<IAttendance | null> {
    const rows = await query<any[]>(
      'SELECT * FROM attendances WHERE userId = ? AND date = ? LIMIT 1',
      [userId, date]
    );
    if (!rows || rows.length === 0) return null;
    return new AttendanceModel(rows[0]);
  },

  async findByDate(date: string): Promise<IAttendance[]> {
    const rows = await query<any[]>('SELECT * FROM attendances WHERE date = ? ORDER BY date DESC', [date]);
    return rows.map((r) => new AttendanceModel(r));
  },

  async findByUserInDateRange(userId: string, startDate: string, endDate: string): Promise<IAttendance[]> {
    const rows = await query<any[]>(
      'SELECT * FROM attendances WHERE userId = ? AND date BETWEEN ? AND ? ORDER BY date DESC',
      [userId, startDate, endDate]
    );
    return rows.map((r) => new AttendanceModel(r));
  },

  async upsertCheckIn(userId: string, date: string, values: Partial<IAttendance>): Promise<IAttendance> {
    const existing = await Attendance.findByUserAndDate(userId, date);
    const attendance = existing || new AttendanceModel({ userId, date });
    Object.assign(attendance, values, { userId, date });
    await attendance.save();
    return attendance;
  },

  async deleteByUser(userId: string): Promise<number> {
    const res = await query<any>('DELETE FROM attendances WHERE userId = ?', [userId]);
    return res.affectedRows || 0;
  },
};
