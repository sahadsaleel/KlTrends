import { Router } from 'express';
import {
  sendOtp,
  verifyOtp,
  registerAdmin,
  loginAdmin,
  registerEmployee,
  loginEmployee,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  getMe,
  updateProfile,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateEmployeeDepartment } from '../validators/index.js';

const router = Router();

// OTP Authentication Endpoints (Registration & Verification)
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

// Admin Auth Endpoints (Username/Password)
router.post('/register', registerAdmin);
router.post('/login', loginAdmin);

// Employee Auth Endpoints (Username/Password)
router.post('/employee/register', validateEmployeeDepartment, registerEmployee);
router.post('/employee/login', loginEmployee);

// Forgot & Reset Password Endpoints
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

// Profile
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

export default router;
