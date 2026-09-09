import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { IReport, Report } from '../models/Report.js';

const dateString = (date: Date) => date.toISOString().slice(0, 10);
const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const nonNegativeNumber = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};
const nonNegativeInteger = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return 0;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && Number.isInteger(number) ? number : null;
};

const validatePayload = (
  body: any
): Pick<
  IReport,
  'date' | 'totalSalesAmount' | 'whatsappEnquiries' | 'totalOrders' | 'codOrders' | 'prepaidOrders'
> | null => {
  const totalSalesAmount = nonNegativeNumber(body.totalSalesAmount);
  const whatsappEnquiries = nonNegativeInteger(body.whatsappEnquiries);
  const codOrders = nonNegativeInteger(body.codOrders);
  const prepaidOrders = nonNegativeInteger(body.prepaidOrders);

  if (
    !validDate(body.date) ||
    totalSalesAmount === null ||
    whatsappEnquiries === null ||
    codOrders === null ||
    prepaidOrders === null
  ) {
    return null;
  }

  const totalOrders = codOrders + prepaidOrders;

  return {
    date: body.date,
    totalSalesAmount,
    whatsappEnquiries,
    totalOrders,
    codOrders,
    prepaidOrders,
  };
};

export const getAllReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = (Number(req.query.month) || now.getMonth() + 1) - 1;
    const start = dateString(new Date(year, month, 1));
    const end = dateString(new Date(year, month + 1, 0));
    const reports = await Report.findInDateRange(start, end, req.user.userId);
    const previousStart = dateString(new Date(year, month - 1, 1));
    const previousEnd = dateString(new Date(year, month, 0));
    const previous = await Report.findInDateRange(previousStart, previousEnd, req.user.userId);

    const totalSales = reports.reduce((sum, report) => sum + report.totalSalesAmount, 0);
    const totalOrders = reports.reduce((sum, report) => sum + report.totalOrders, 0);
    const codOrders = reports.reduce((sum, report) => sum + report.codOrders, 0);
    const prepaidOrders = reports.reduce((sum, report) => sum + report.prepaidOrders, 0);
    const whatsappEnquiries = reports.reduce((sum, report) => sum + report.whatsappEnquiries, 0);

    const previousSales = previous.reduce((sum, report) => sum + report.totalSalesAmount, 0);

    res.json({
      success: true,
      data: {
        reports,
        summary: {
          totalSales,
          totalOrders,
          codOrders,
          prepaidOrders,
          whatsappEnquiries,
          percentChange: previousSales ? Math.round(((totalSales - previousSales) / previousSales) * 100) : 0,
          month: new Date(year, month).toLocaleString('en', { month: 'short' }),
          year,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error fetching reports' });
  }
};

export const getReportById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const report = await Report.findByIdForUser(req.params.id, req.user.userId);
    if (!report) {
      res.status(404).json({ success: false, error: 'Report not found' });
      return;
    }
    res.json({ success: true, data: { report } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error fetching report' });
  }
};

export const createReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const reportData = validatePayload(req.body);
    if (!reportData) {
      res.status(400).json({
        success: false,
        error: 'Provide a valid date, total sales amount, and order counts (COD and prepaid).',
      });
      return;
    }
    const existing = await Report.findByUserAndDate(req.user.userId, reportData.date);
    if (existing) {
      res.status(409).json({
        success: false,
        error: `A report already exists for ${reportData.date}.`,
        data: { reportId: existing.id },
      });
      return;
    }
    const report = await Report.create({ userId: req.user.userId, ...reportData });
    res.status(201).json({ success: true, message: 'Report created successfully', data: { report } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error creating report' });
  }
};

export const updateReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const reportData = validatePayload(req.body);
    if (!reportData) {
      res.status(400).json({
        success: false,
        error: 'Provide a valid date, total sales amount, and order counts (COD and prepaid).',
      });
      return;
    }
    const report = await Report.updateForUser(req.params.id, req.user.userId, reportData);
    if (!report) {
      res.status(404).json({ success: false, error: 'Report not found or access denied' });
      return;
    }
    res.json({ success: true, message: 'Report updated successfully', data: { report } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error updating report' });
  }
};

export const deleteReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const deleted = await Report.deleteForUser(req.params.id, req.user.userId);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Report not found or access denied' });
      return;
    }
    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error deleting report' });
  }
};
