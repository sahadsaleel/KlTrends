import { Router } from 'express';
import {
  createProductReturn,
  getProductReturns,
  createDailyExpense,
  getDailyExpenses,
} from '../controllers/managerController.js';
import { protect, requireDepartment } from '../middleware/authMiddleware.js';

const router = Router();

// Protect all manager department routes: Requires valid auth and department === 'manager' (or admin)
router.use(protect);
router.use(requireDepartment('manager'));

// Product Returns
router.post('/product-returns', createProductReturn);
router.get('/product-returns', getProductReturns);

// Daily Expenses
router.post('/daily-expenses', createDailyExpense);
router.get('/daily-expenses', getDailyExpenses);

export default router;
