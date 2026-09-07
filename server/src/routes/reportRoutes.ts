import { Router } from 'express';

import {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
} from '../controllers/reportController.js';

import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// All report routes require authentication
router.use(protect);

// GET /api/reports
router.get(
  '/',
  getAllReports
);

// GET /api/reports/:id
router.get(
  '/:id',
  getReportById
);

// POST /api/reports
router.post(
  '/',
  createReport
);

// PUT /api/reports/:id
router.put(
  '/:id',
  updateReport
);

// DELETE /api/reports/:id
router.delete(
  '/:id',
  deleteReport
);

export default router;