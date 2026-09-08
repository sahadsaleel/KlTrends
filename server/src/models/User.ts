import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { normalizeDepartment, Department } from '../validators/index.js';

export interface IUser {
  id: string;
  username?: string;
  fullName?: string;
  employeeId?: string;
  email: string;
  password: string;
  role: 'admin' | 'employee' | 'manager';
  age?: number;
  phone?: string;
  joiningDate?: string;
  department?: Department | string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  save(): Promise<IUser>;
}

export class UserModel implements IUser {
  id: string;
  username?: string;
  fullName?: string;
  employeeId?: string;
  email: string;
  password: string;
  role: 'admin' | 'employee' | 'manager';
  age?: number;
  phone?: string;
  joiningDate?: string;
  department?: Department | string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = data.id || uuidv4();
    this.username = data.username || data.fullName;
    this.fullName = data.fullName || data.username;
    this.employeeId = data.employeeId || undefined;
    this.email = data.email?.toLowerCase().trim();
    this.password = data.password;
    this.role = data.role || 'employee';
    this.age = data.age !== undefined && data.age !== null ? Number(data.age) : undefined;
    this.phone = data.phone || undefined;
    this.joiningDate = data.joiningDate || undefined;
    const normDept = data.department ? normalizeDepartment(data.department) : null;
    this.department = normDept || (this.role === 'employee' ? 'sales' : undefined);
    this.avatarUrl = data.avatarUrl || undefined;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }

  async comparePassword(candidatePassword: string): Promise<boolean> {
    if (!this.password) return false;
    // Support bcrypt hashed passwords and direct comparison fallback
    if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
      return await bcrypt.compare(candidatePassword, this.password);
    }
    return candidatePassword === this.password;
  }

  async save(): Promise<IUser> {
    const existing = await User.findById(this.id);
    if (existing) {
      await query(
        `UPDATE users SET
          username = ?, fullName = ?, employeeId = ?, email = ?, password = ?,
          role = ?, age = ?, phone = ?, joiningDate = ?, department = ?, avatarUrl = ?,
          updatedAt = NOW()
        WHERE id = ?`,
        [
          this.username || null,
          this.fullName || null,
          this.employeeId || null,
          this.email,
          this.password,
          this.role,
          this.age !== undefined ? this.age : null,
          this.phone || null,
          this.joiningDate || null,
          this.department || null,
          this.avatarUrl || null,
          this.id,
        ]
      );
    } else {
      await query(
        `INSERT INTO users (id, username, fullName, employeeId, email, password, role, age, phone, joiningDate, department, avatarUrl, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          this.id,
          this.username || null,
          this.fullName || null,
          this.employeeId || null,
          this.email,
          this.password,
          this.role,
          this.age !== undefined ? this.age : null,
          this.phone || null,
          this.joiningDate || null,
          this.department || null,
          this.avatarUrl || null,
        ]
      );
    }
    return this;
  }
}

export const User = {
  async findById(id: string): Promise<IUser | null> {
    if (!id) return null;
    const rows = await query<any[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    if (!rows || rows.length === 0) return null;
    return new UserModel(rows[0]);
  },

  async findOne(filter: Record<string, any>): Promise<IUser | null> {
    const conditions: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (key === 'id') {
        conditions.push('id = ?');
        params.push(value);
      } else {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await query<any[]>(`SELECT * FROM users ${whereClause} LIMIT 1`, params);
    if (!rows || rows.length === 0) return null;
    return new UserModel(rows[0]);
  },

  async find(filter: Record<string, any> = {}): Promise<IUser[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (key === 'id') {
        conditions.push('id = ?');
        params.push(value);
      } else {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await query<any[]>(`SELECT * FROM users ${whereClause} ORDER BY createdAt DESC`, params);
    return rows.map((r) => new UserModel(r));
  },

  async create(data: any): Promise<IUser> {
    const id = data.id || uuidv4();
    let password = data.password || 'Password123!';

    // Hash password if not hashed
    if (!password.startsWith('$2a$') && !password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      password = await bcrypt.hash(password, salt);
    }

    const user = new UserModel({
      ...data,
      id,
      password,
    });

    await user.save();
    return user;
  },

  async findByIdAndUpdate(id: string, updateData: any, options?: any): Promise<IUser | null> {
    const user = await User.findById(id);
    if (!user) return null;

    Object.assign(user, updateData);
    await user.save();
    return user;
  },

  async findByIdAndDelete(id: string): Promise<boolean> {
    const res = await query('DELETE FROM users WHERE id = ?', [id]);
    return res.affectedRows > 0;
  },

  async findAllNonAdmins(): Promise<IUser[]> {
    const rows = await query<any[]>("SELECT * FROM users WHERE role != 'admin' ORDER BY createdAt DESC");
    return rows.map((row) => new UserModel(row));
  },

  async findByIds(ids: string[]): Promise<IUser[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    const rows = await query<any[]>(`SELECT * FROM users WHERE id IN (${placeholders})`, ids);
    return rows.map((row) => new UserModel(row));
  },

  async countNonAdmins(): Promise<number> {
    const rows = await query<any[]>("SELECT COUNT(*) AS count FROM users WHERE role != 'admin'");
    return Number(rows[0]?.count || 0);
  },

  async count(filter: Record<string, any> = {}): Promise<number> {
    const conditions: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(filter)) {
      conditions.push(`${key} = ?`);
      params.push(value);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await query<any[]>(`SELECT COUNT(*) as count FROM users ${whereClause}`, params);
    return rows[0]?.count || 0;
  },

  async findByUsername(username: string): Promise<IUser | null> {
    if (!username) return null;
    const cleanUsername = username.trim();
    const rows = await query<any[]>(
      'SELECT * FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1',
      [cleanUsername]
    );
    if (!rows || rows.length === 0) return null;
    return new UserModel(rows[0]);
  },

  async findByEmail(email: string): Promise<IUser | null> {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const rows = await query<any[]>(
      'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [cleanEmail]
    );
    if (!rows || rows.length === 0) return null;
    return new UserModel(rows[0]);
  },

  async findByEmployeeId(employeeId: string): Promise<IUser | null> {
    if (!employeeId) return null;
    const rows = await query<any[]>('SELECT * FROM users WHERE employeeId = ? LIMIT 1', [employeeId.trim()]);
    return rows.length ? new UserModel(rows[0]) : null;
  },

  async findByUsernameOrEmail(identifier: string): Promise<IUser | null> {
    if (!identifier) return null;
    const clean = identifier.trim();
    const rows = await query<any[]>(
      'SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1',
      [clean, clean.toLowerCase()]
    );
    if (!rows || rows.length === 0) return null;
    return new UserModel(rows[0]);
  },
};
