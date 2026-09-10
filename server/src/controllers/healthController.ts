import { Request, Response } from 'express';
import { query } from '../config/db.js';
import { verifySmtpConnection } from '../services/emailService.js';

export const getHealthStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    await query('SELECT 1');
    const smtpConfigured = !!(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
    res.status(200).json({
      success: true,
      message: 'Employee Management API and database are available',
      smtpConfigured,
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      success: false,
      error: 'Database is unavailable',
      timestamp: new Date().toISOString(),
    });
  }
};

export const getEmailHealthStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = await verifySmtpConnection();
    res.status(status.connected ? 200 : 503).json({
      success: status.connected,
      ...status,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'SMTP diagnostic check failed',
      timestamp: new Date().toISOString(),
    });
  }
};
