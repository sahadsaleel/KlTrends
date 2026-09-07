import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';

export interface IReadReceipt {
  userId: string;
  readAt: Date;
}

export interface INotification {
  id: string;
  senderId?: string;
  senderName?: string;
  title: string;
  message: string;
  type: 'broadcast' | 'announcement' | 'direct' | 'alert';
  priority: 'normal' | 'high' | 'urgent';
  targetType: 'all' | 'department' | 'employee';
  targetId?: string;
  targetLabel?: string;
  readBy: IReadReceipt[];
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<INotification>;
}

export class NotificationModel implements INotification {
  id: string;
  senderId?: string;
  senderName?: string;
  title: string;
  message: string;
  type: 'broadcast' | 'announcement' | 'direct' | 'alert';
  priority: 'normal' | 'high' | 'urgent';
  targetType: 'all' | 'department' | 'employee';
  targetId?: string;
  targetLabel?: string;
  readBy: IReadReceipt[];
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = data.id || uuidv4();
    this.senderId = data.senderId ? String(data.senderId) : undefined;
    this.senderName = data.senderName || 'Management';
    this.title = String(data.title || '');
    this.message = String(data.message || '');
    this.type = data.type || 'broadcast';
    this.priority = data.priority || 'normal';
    this.targetType = data.targetType || 'all';
    this.targetId = data.targetId ? String(data.targetId) : undefined;
    this.targetLabel = data.targetLabel || undefined;
    this.readBy = Array.isArray(data.readBy) ? data.readBy : [];
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }

  async save(): Promise<INotification> {
    const existing = await Notification.findById(this.id);

    if (existing) {
      await query(
        `UPDATE notifications SET
          senderId = ?, senderName = ?, title = ?, message = ?,
          type = ?, priority = ?, targetType = ?, targetId = ?, targetLabel = ?,
          updatedAt = NOW()
        WHERE id = ?`,
        [
          this.senderId || null,
          this.senderName || null,
          this.title,
          this.message,
          this.type,
          this.priority,
          this.targetType,
          this.targetId || null,
          this.targetLabel || null,
          this.id,
        ]
      );
    } else {
      await query(
        `INSERT INTO notifications (id, senderId, senderName, title, message, type, priority, targetType, targetId, targetLabel, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          this.id,
          this.senderId || null,
          this.senderName || null,
          this.title,
          this.message,
          this.type,
          this.priority,
          this.targetType,
          this.targetId || null,
          this.targetLabel || null,
        ]
      );
    }

    // Sync read receipts
    if (this.readBy && this.readBy.length > 0) {
      for (const receipt of this.readBy) {
        await query(
          `INSERT IGNORE INTO notification_reads (id, notificationId, userId, readAt)
           VALUES (?, ?, ?, ?)`,
          [uuidv4(), this.id, String(receipt.userId), receipt.readAt || new Date()]
        );
      }
    }

    return this;
  }
}

export const Notification = {
  async findById(id: string): Promise<INotification | null> {
    if (!id) return null;
    const rows = await query<any[]>('SELECT * FROM notifications WHERE id = ? LIMIT 1', [id]);
    if (!rows || rows.length === 0) return null;

    const notif = new NotificationModel(rows[0]);
    // Fetch read receipts
    const reads = await query<any[]>('SELECT userId, readAt FROM notification_reads WHERE notificationId = ?', [id]);
    notif.readBy = reads.map((r) => ({ userId: String(r.userId), readAt: new Date(r.readAt) }));
    return notif;
  },

  async find(filter: any = {}): Promise<INotification[]> {
    let whereClause = '';
    const params: any[] = [];

    // Match the recipient groups supplied by the application.
    if (filter.recipients && Array.isArray(filter.recipients)) {
      const orClauses: string[] = [];

      for (const cond of filter.recipients) {
        if (cond.targetType === 'all') {
          orClauses.push("targetType = 'all'");
        } else if (cond.targetType === 'department') {
          orClauses.push('(targetType = ? AND LOWER(targetId) = LOWER(?))');
          params.push('department', String(cond.targetId).replace(/[/$^]/g, ''));
        } else if (cond.targetType === 'employee') {
          if (Array.isArray(cond.targetIds)) {
            const placeholders = cond.targetIds.map(() => '?').join(',');
            orClauses.push(`(targetType = ? AND targetId IN (${placeholders}))`);
            params.push('employee', ...cond.targetIds);
          } else {
            orClauses.push('(targetType = ? AND targetId = ?)');
            params.push('employee', String(cond.targetId));
          }
        }
      }

      if (orClauses.length > 0) {
        whereClause = `WHERE ${orClauses.join(' OR ')}`;
      }
    }

    const rows = await query<any[]>(
      `SELECT * FROM notifications ${whereClause} ORDER BY createdAt DESC LIMIT 100`,
      params
    );

    if (!rows || rows.length === 0) return [];

    const notifIds = rows.map((r) => r.id);
    const placeholders = notifIds.map(() => '?').join(',');
    const allReads = await query<any[]>(
      `SELECT notificationId, userId, readAt FROM notification_reads WHERE notificationId IN (${placeholders})`,
      notifIds
    );

    const readsMap = new Map<string, IReadReceipt[]>();
    for (const r of allReads) {
      const list = readsMap.get(r.notificationId) || [];
      list.push({ userId: String(r.userId), readAt: new Date(r.readAt) });
      readsMap.set(r.notificationId, list);
    }

    return rows.map((r) => {
      const notif = new NotificationModel(r);
      notif.readBy = readsMap.get(r.id) || [];
      return notif;
    });
  },

  async create(data: any): Promise<INotification> {
    const model = new NotificationModel(data);
    await model.save();
    return model;
  },

  async findByIdAndDelete(id: string): Promise<boolean> {
    const res = await query('DELETE FROM notifications WHERE id = ?', [id]);
    return res.affectedRows > 0;
  },

  async count(filter: any = {}): Promise<number> {
    const list = await Notification.find(filter);
    if (filter.unreadForUser) {
      const checkUserId = String(filter.unreadForUser);
      return list.filter((n) => !n.readBy.some((r) => r.userId === checkUserId)).length;
    }
    return list.length;
  },
};
