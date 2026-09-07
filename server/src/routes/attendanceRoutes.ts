import { Router } from 'express';
import {
  checkIn,
  checkOut,
  getTodayStatus,
  getMonthlyAttendance,
} from '../controllers/attendanceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// Protect all attendance routes
router.use(protect);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/today', getTodayStatus);
router.get('/monthly', getMonthlyAttendance);

export default router;
