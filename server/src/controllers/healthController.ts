import { Request, Response } from 'express';
import { query } from '../config/db.js';

export const getHealthStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    await query('SELECT 1');
    res.status(200).json({
      success: true,
      message: 'Employee Management API and database are available',
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
