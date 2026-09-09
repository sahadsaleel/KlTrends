import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';

export type OtpPurpose = 'login' | 'register' | 'forgot-password' | 'reset-password' | string;
export type OtpRole = 'admin' | 'employee' | 'manager' | string;

export interface IOtp {
  id: string;
  email: string;
  otp: string;
  purpose: OtpPurpose;
  role: OtpRole;
  registrationData?: any;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
}

export class OtpModel implements IOtp {
  id: string;
  email: string;
  otp: string;
  purpose: OtpPurpose;
  role: OtpRole;
  registrationData?: any;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;

  constructor(data: any) {
    this.id = data.id || uuidv4();
    this.email = data.email?.toLowerCase().trim();
    this.otp = String(data.otp);
    this.purpose = data.purpose;
    this.role = data.role || 'employee';

    if (typeof data.registrationData === 'string') {
      try {
        this.registrationData = JSON.parse(data.registrationData);
      } catch {
        this.registrationData = null;
      }
    } else {
      this.registrationData = data.registrationData || null;
    }

    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.expiresAt = data.expiresAt
      ? new Date(data.expiresAt)
      : new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    this.attempts = Number(data.attempts || 0);
  }
}

export const Otp = {
  async findOne(filter: Record<string, any>): Promise<IOtp | null> {
    const conditions: string[] = ['expiresAt > NOW()', 'attempts < 5'];
    const params: any[] = [];
    let submittedOtp: string | undefined;

    for (const [key, value] of Object.entries(filter)) {
      if (key === 'otp') {
        submittedOtp = String(value);
        continue;
      }
      if (key === 'email') {
        conditions.push('LOWER(email) = LOWER(?)');
        params.push(value);
      } else {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const rows = await query<any[]>(`SELECT * FROM otps ${whereClause} ORDER BY createdAt DESC LIMIT 5`, params);
    if (!rows || rows.length === 0 || !submittedOtp) return null;
    for (const row of rows) {
      if (await bcrypt.compare(submittedOtp, row.otp)) return new OtpModel(row);
      await query('UPDATE otps SET attempts = attempts + 1 WHERE id = ?', [row.id]);
    }
    return null;
  },

  async create(data: any): Promise<IOtp> {
    const model = new OtpModel(data);
    const otpHash = await bcrypt.hash(model.otp, 12);
    const regDataJson = model.registrationData ? JSON.stringify(model.registrationData) : null;

    await query(
      `INSERT INTO otps (id, email, otp, purpose, role, registrationData, createdAt, expiresAt, attempts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        model.id,
        model.email,
        otpHash,
        model.purpose,
        model.role,
        regDataJson,
        model.createdAt,
        model.expiresAt,
      ]
    );

    return model;
  },

  async deleteForEmailAndPurpose(email: string, purpose: OtpPurpose): Promise<number> {
    const res = await query<any>('DELETE FROM otps WHERE LOWER(email) = LOWER(?) AND purpose = ?', [email, purpose]);
    return res.affectedRows || 0;
  },
};
