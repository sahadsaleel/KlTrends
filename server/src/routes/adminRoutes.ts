import { Router } from 'express';
import {
  getDashboardStats,
  getAllEmployees,
  getAllEmployeeReports,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from '../controllers/adminController.js';
import { exportEmployeeReports } from '../controllers/reportExportController.js';
import {
  createNotification,
  getAdminNotifications,
  deleteNotification,
} from '../controllers/notificationController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(protect);
router.use(adminOnly);

// Admin dashboard & management
router.get('/dashboard', getDashboardStats);
router.get('/employees', getAllEmployees);
router.post('/employees', createEmployee);
router.put('/employees/:id', updateEmployee);
router.delete('/employees/:id', deleteEmployee);
router.get('/reports/export', exportEmployeeReports);
router.get('/reports', getAllEmployeeReports);

// Admin notification broadcast & management
router.post('/notifications', createNotification);
router.get('/notifications', getAdminNotifications);
router.delete('/notifications/:id', deleteNotification);

export default router;
