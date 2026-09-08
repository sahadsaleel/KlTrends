import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { MediaActivity, MediaActivityType } from '../models/MediaActivity.js';
import { User } from '../models/User.js';

const normalizeDate = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T00:00:00Z`);
    return parsed.toISOString().slice(0, 10) === trimmed ? trimmed : null;
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

const readActivityType = (value: string): MediaActivityType =>
  value === 'video-out' ? 'video-out' : 'video-shoot';

export const createMediaActivity = (activityType: MediaActivityType) => async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const date = normalizeDate(body.date);
    const totalVideos = positiveInteger(body.totalVideos);
    if (!date) {
      res.status(400).json({ success: false, error: 'Valid date in YYYY-MM-DD or DD-MM-YYYY format is required.' });
      return;
    }
    if (totalVideos === null) {
      res.status(400).json({ success: false, error: 'Total videos must be a positive whole number greater than zero.' });
      return;
    }

    let employeeId = req.user.userId;
    let employeeName = req.user.email;
    const user = await User.findById(req.user.userId);
    if (user) {
      employeeId = user.employeeId || req.user.userId;
      employeeName = user.fullName || user.username || req.user.email;
    }
    const activity = await MediaActivity.create({
      userId: req.user.userId,
      employeeId,
      employeeName,
      department: 'media',
      activityType,
      date,
      totalVideos,
      notes: typeof body.notes === 'string' ? body.notes.trim() || undefined : undefined,
    });
    res.status(201).json({ success: true, message: 'Media activity recorded successfully.', data: { activity } });
  } catch (error: any) {
    console.error(`Error creating Media ${activityType} activity:`, error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error.' });
  }
};

export const getMediaActivities = (activityType: MediaActivityType) => async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const date = typeof req.query.date === 'string' ? normalizeDate(req.query.date) : undefined;
    const startDate = typeof req.query.startDate === 'string' ? normalizeDate(req.query.startDate) : undefined;
    const endDate = typeof req.query.endDate === 'string' ? normalizeDate(req.query.endDate) : undefined;
    const filter = { activityType, date: date || undefined, startDate: startDate || undefined, endDate: endDate || undefined };
    const [activities, summary] = await Promise.all([
      MediaActivity.findFiltered(filter),
      MediaActivity.getSummary(filter),
    ]);
    res.json({ success: true, data: { activities, summary } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error.' });
  }
};