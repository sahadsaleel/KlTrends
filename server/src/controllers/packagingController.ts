import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { PackingOrderSource, PackingRecord, PackingRecordFilter } from '../models/PackingRecord.js';
import { User } from '../models/User.js';

const normalizeDate = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T00:00:00Z`);
    return date.toISOString().slice(0, 10) === trimmed ? trimmed : null;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('-');
    return normalizeDate(`${year}-${month}-${day}`);
  }
  return null;
};

const positiveInteger = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const createPackingRecord = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const date = normalizeDate(body.date);
    const ordersPacked = positiveInteger(body.ordersPacked);
    const orderSource = typeof body.orderSource === 'string' ? body.orderSource.trim().toLowerCase() : '';
    if (!date) {
      res.status(400).json({ success: false, error: 'Valid date in YYYY-MM-DD or DD-MM-YYYY format is required.' });
      return;
    }
    if (orderSource !== 'kltrends' && orderSource !== 'klindia') {
      res.status(400).json({ success: false, error: 'Order source must be kltrends or klindia.' });
      return;
    }
    if (ordersPacked === null) {
      res.status(400).json({ success: false, error: 'Orders packed must be a positive whole number greater than zero.' });
      return;
    }

    let employeeId = req.user.userId;
    let employeeName = req.user.email;
    const user = await User.findById(req.user.userId);
    if (user) {
      employeeId = user.employeeId || req.user.userId;
      employeeName = user.fullName || user.username || req.user.email;
    }
    const record = await PackingRecord.create({
      userId: req.user.userId,
      employeeId,
      employeeName,
      department: 'packaging',
      date,
      orderSource: orderSource as PackingOrderSource,
      ordersPacked,
      notes: typeof body.notes === 'string' ? body.notes.trim() || undefined : undefined,
    });
    res.status(201).json({ success: true, message: 'Packing record saved successfully.', data: { record } });
  } catch (error: any) {
    console.error('Error creating packing record:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error.' });
  }
};

export const getPackingRecords = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const orderSource = typeof req.query.orderSource === 'string' ? req.query.orderSource.toLowerCase() : undefined;
    const filter: PackingRecordFilter = {
      userId: req.user.role === 'admin' ? undefined : req.user.userId,
      orderSource: orderSource === 'kltrends' || orderSource === 'klindia' ? orderSource : 'all' as const,
      date: typeof req.query.date === 'string' ? normalizeDate(req.query.date) || undefined : undefined,
      startDate: typeof req.query.startDate === 'string' ? normalizeDate(req.query.startDate) || undefined : undefined,
      endDate: typeof req.query.endDate === 'string' ? normalizeDate(req.query.endDate) || undefined : undefined,
    };
    const [records, summary] = await Promise.all([PackingRecord.findFiltered(filter), PackingRecord.getSummary(filter)]);
    res.json({ success: true, data: { records, summary } });
  } catch (error: any) {
    console.error('Error fetching packing records:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error.' });
  }
};