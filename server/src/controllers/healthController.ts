import { Request, Response } from 'express';
import { query } from '../config/db.js';

export const getHealthStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    await query('SELECT 1');

    const resendConfigured = !!process.env.RESEND_API_KEY?.trim();

    res.status(200).json({
      success: true,
      message: 'Employee Management API and database are available',
      resendConfigured,
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

export const getEmailHealthStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const resendConfigured = !!process.env.RESEND_API_KEY?.trim();
    const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();

    if (!resendConfigured) {
      res.status(503).json({
        success: false,
        emailProvider: 'Resend',
        configured: false,
        error: 'RESEND_API_KEY is not configured',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      emailProvider: 'Resend',
      configured: true,
      fromEmail: fromEmail || 'not configured',
      message: 'Resend email service is configured',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      emailProvider: 'Resend',
      error: error?.message || 'Email health check failed',
      timestamp: new Date().toISOString(),
    });
  }
};