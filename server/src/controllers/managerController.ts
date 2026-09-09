import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { ProductReturn, OrderSource, ProductReturnFilter } from '../models/ProductReturn.js';
import { DailyExpense, DailyExpenseFilter, EXPENSE_CATEGORIES } from '../models/DailyExpense.js';
import { User } from '../models/User.js';

const normalizeToIsoDate = (val: unknown): string | null => {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const [dd, mm, yyyy] = trimmed.split('-');
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
};

const positiveInteger = (val: unknown): number | null => {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) && n > 0 && Number.isInteger(n) ? n : null;
};

const positiveNumber = (val: unknown): number | null => {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// ==================== PRODUCT RETURNS ====================

export const createProductReturn = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { date, orderSource, returnQuantity, notes } = req.body;

    const isoDate = normalizeToIsoDate(date);
    if (!isoDate) {
      res.status(400).json({ success: false, error: 'Valid date in YYYY-MM-DD or DD-MM-YYYY format is required.' });
      return;
    }

    const normalizedSource = typeof orderSource === 'string' ? orderSource.toLowerCase().trim() : '';
    if (normalizedSource !== 'kltrends' && normalizedSource !== 'klindia') {
      res.status(400).json({
        success: false,
        error: 'Order source is required and must be either "kltrends" or "klindia".',
      });
      return;
    }

    const parsedQty = positiveInteger(returnQuantity);
    if (parsedQty === null) {
      res.status(400).json({
        success: false,
        error: 'Return quantity is required and must be a positive integer greater than zero.',
      });
      return;
    }

    // Fetch submitter info safely
    let employeeId = req.user.userId;
    let employeeName = req.user.email;
    try {
      const dbUser = await User.findById(req.user.userId);
      if (dbUser) {
        employeeId = dbUser.employeeId || req.user.userId;
        employeeName = dbUser.fullName || dbUser.username || req.user.email;
      }
    } catch (e) {
      console.warn('Could not fetch user details for return:', e);
    }

    const newReturn = await ProductReturn.create({
      userId: req.user.userId,
      employeeId,
      employeeName,
      department: 'manager',
      date: isoDate,
      orderSource: normalizedSource as OrderSource,
      returnQuantity: parsedQty,
      notes: typeof notes === 'string' ? notes.trim() : undefined,
    });

    res.status(201).json({
      success: true,
      message: 'Product return recorded successfully.',
      data: { return: newReturn },
    });
  } catch (error: any) {
    console.error('Error creating product return:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error.' });
  }
};

export const getProductReturns = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { orderSource, startDate, endDate, date } = req.query;

    const filter: ProductReturnFilter = {
      userId: req.user.role === 'admin' ? undefined : req.user.userId,
    };
    if (typeof orderSource === 'string' && orderSource.trim() && orderSource !== 'all') {
      filter.orderSource = orderSource.toLowerCase().trim() as OrderSource;
    }
    if (typeof date === 'string') {
      const normDate = normalizeToIsoDate(date);
      if (normDate) filter.date = normDate;
    }
    if (typeof startDate === 'string') {
      const normStart = normalizeToIsoDate(startDate);
      if (normStart) filter.startDate = normStart;
    }
    if (typeof endDate === 'string') {
      const normEnd = normalizeToIsoDate(endDate);
      if (normEnd) filter.endDate = normEnd;
    }

    const [returns, summary] = await Promise.all([
      ProductReturn.findFiltered(filter),
      ProductReturn.getSummary(filter),
    ]);

    res.json({
      success: true,
      data: {
        returns,
        summary,
      },
    });
  } catch (error: any) {
    console.error('Error fetching product returns:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error.' });
  }
};

// ==================== DAILY EXPENSES ====================

export const createDailyExpense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { date, category, customCategoryName, amount, description } = req.body;

    const isoDate = normalizeToIsoDate(date);
    if (!isoDate) {
      res.status(400).json({ success: false, error: 'Valid date in YYYY-MM-DD or DD-MM-YYYY format is required.' });
      return;
    }

    if (!category || typeof category !== 'string' || !category.trim()) {
      res.status(400).json({ success: false, error: 'Expense category is required.' });
      return;
    }

    const normCategory = category.toLowerCase().trim();
    const isStandardCategory = (EXPENSE_CATEGORIES as readonly string[]).includes(normCategory);

    if (!isStandardCategory && normCategory !== 'custom') {
      res.status(400).json({
        success: false,
        error: `Invalid category. Allowed categories are: ${EXPENSE_CATEGORIES.join(', ')}.`,
      });
      return;
    }

    let resolvedCustomName: string | undefined;
    if (normCategory === 'custom') {
      if (!customCategoryName || typeof customCategoryName !== 'string' || !customCategoryName.trim()) {
        res.status(400).json({
          success: false,
          error: 'Custom Expense Name is required when category is set to Custom.',
        });
        return;
      }
      resolvedCustomName = customCategoryName.trim();
    }

    const parsedAmount = positiveNumber(amount);
    if (parsedAmount === null) {
      res.status(400).json({
        success: false,
        error: 'Amount is required and must be a valid positive number greater than zero.',
      });
      return;
    }

    // Fetch submitter info safely
    let employeeId = req.user.userId;
    let employeeName = req.user.email;
    try {
      const dbUser = await User.findById(req.user.userId);
      if (dbUser) {
        employeeId = dbUser.employeeId || req.user.userId;
        employeeName = dbUser.fullName || dbUser.username || req.user.email;
      }
    } catch (e) {
      console.warn('Could not fetch user details for expense:', e);
    }

    const newExpense = await DailyExpense.create({
      userId: req.user.userId,
      employeeId,
      employeeName,
      department: 'manager',
      date: isoDate,
      category: normCategory,
      customCategoryName: resolvedCustomName,
      amount: parsedAmount,
      description: typeof description === 'string' ? description.trim() : undefined,
    });

    res.status(201).json({
      success: true,
      message: 'Daily expense recorded successfully.',
      data: { expense: newExpense },
    });
  } catch (error: any) {
    console.error('Error creating daily expense:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error.' });
  }
};

export const getDailyExpenses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { category, startDate, endDate, date } = req.query;

    const filter: DailyExpenseFilter = {
      userId: req.user.role === 'admin' ? undefined : req.user.userId,
    };
    if (typeof category === 'string' && category.trim() && category !== 'all') {
      filter.category = category.toLowerCase().trim();
    }
    if (typeof date === 'string') {
      const normDate = normalizeToIsoDate(date);
      if (normDate) filter.date = normDate;
    }
    if (typeof startDate === 'string') {
      const normStart = normalizeToIsoDate(startDate);
      if (normStart) filter.startDate = normStart;
    }
    if (typeof endDate === 'string') {
      const normEnd = normalizeToIsoDate(endDate);
      if (normEnd) filter.endDate = normEnd;
    }

    const [expenses, summary] = await Promise.all([
      DailyExpense.findFiltered(filter),
      DailyExpense.getSummary(filter),
    ]);

    res.json({
      success: true,
      data: {
        expenses,
        summary: {
          totalAmount: summary.totalAmount,
          count: summary.count,
          period: {
            startDate: filter.startDate || filter.date || null,
            endDate: filter.endDate || filter.date || null,
          },
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching daily expenses:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error.' });
  }
};
