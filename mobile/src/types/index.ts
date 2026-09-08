export const VALID_DEPARTMENTS = ['sales', 'manager', 'packaging', 'media'] as const;
export type Department = (typeof VALID_DEPARTMENTS)[number];

export interface User {
  id: string;
  name?: string;
  fullName?: string;
  username?: string;
  email: string;
  employeeId?: string;
  role: 'admin' | 'employee' | 'manager';
  age?: number;
  phone?: string;
  joiningDate?: string;
  department?: Department | string;
  designation?: string;
  avatarUrl?: string;
}

export interface Employee extends User {
  phone?: string;
  joiningDate?: string;
  salary?: number;
  status?: 'active' | 'inactive' | 'on_leave';
  avatarUrl?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}
