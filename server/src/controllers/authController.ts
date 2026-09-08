import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { User, IUser } from '../models/User.js';
import { Otp } from '../models/Otp.js';
import { sendOtpEmail } from '../services/emailService.js';
import { generateToken } from '../utils/jwt.js';
import { AuthenticatedRequest } from '../types/index.js';
import { uploadProfileImage } from '../services/cloudinaryService.js';
import { isValidDepartment, normalizeDepartment, VALID_DEPARTMENTS } from '../validators/index.js';

const queueOtpEmail = (options: Parameters<typeof sendOtpEmail>[0]): void => {
  void sendOtpEmail(options).catch((error) => console.error('[Email] OTP delivery failed:', error));
};

// Helper for password validation requirements
const validatePasswordRequirements = (password: string): string | null => {
  if (!password || password.length < 10) {
    return 'Password must be at least 10 characters long';
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must include at least one letter and one number';
  }
  return null;
};

// Helper for username validation
const validateUsernameRequirements = (username: string): string | null => {
  if (!username || username.trim().length < 3) {
    return 'Username must be at least 3 characters long';
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(username.trim())) {
    return 'Username can only contain letters, numbers, underscores, dashes, and periods';
  }
  return null;
};

const isAllowedAdminEmail = (email: string): boolean => {
  const allowedEmails = (process.env.ADMIN_EMAIL_ALLOWLIST || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return allowedEmails.includes(email.toLowerCase());
};

// Helper for formatting consistent full user responses
const formatUserResponse = (user: IUser) => ({
  id: user.id,
  username: user.username || user.fullName || user.email.split('@')[0],
  fullName: user.fullName || user.username || user.email.split('@')[0],
  employeeId: user.employeeId,
  email: user.email,
  role: user.role,
  age: user.age,
  phone: user.phone,
  joiningDate: user.joiningDate,
  department: user.department,
  avatarUrl: user.avatarUrl,
});

// Helper for masking email in responses
const maskEmail = (email: string): string => {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length <= 2 ? name[0] + '*' : name.slice(0, 2) + '*'.repeat(name.length - 2);
  return `${maskedName}@${domain}`;
};

// ─── OTP CONTROLLERS ─────────────────────────────────────────────────────────

/**
 * @desc    Send 6-digit OTP code to user's email for Registration or Password Recovery
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
export const sendOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, identifier, purpose, role, registrationData } = req.body;
    const effectivePurpose = purpose || 'register';
    const effectiveRole = role || 'employee';

    // Handle Forgot Password flow
    if (effectivePurpose === 'forgot-password' || effectivePurpose === 'reset-password') {
      const userIdentifier = identifier || email;
      if (!userIdentifier) {
        res.status(400).json({
          success: false,
          error: 'Please provide your registered username or email address.',
        });
        return;
      }

      const existingUser = await User.findByUsernameOrEmail(userIdentifier);
      if (!existingUser) {
        res.status(404).json({
          success: false,
          error: 'No account found with this username or email address.',
        });
        return;
      }

      const targetEmail = existingUser.email;
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Delete previous forgot-password OTPs for this email
      await Otp.deleteForEmailAndPurpose(targetEmail, 'forgot-password');

      // Save OTP (10 min expiry)
      await Otp.create({
        email: targetEmail,
        otp,
        purpose: 'forgot-password',
        role: existingUser.role,
        createdAt: new Date(),
      });

      queueOtpEmail({
        to: targetEmail,
        otp,
        purpose: 'forgot-password',
        role: existingUser.role,
        name: existingUser.fullName || existingUser.username,
      });

      res.status(200).json({
        success: true,
        message: `A 6-digit verification code has been sent to ${maskEmail(targetEmail)}`,
        email: targetEmail,
      });
      return;
    }

    // Handle Registration flow
    if (effectivePurpose === 'register') {
      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Please provide a valid email address.',
        });
        return;
      }

      const cleanEmail = email.toLowerCase().trim();
      if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
        res.status(400).json({
          success: false,
          error: 'Please provide a valid corporate email address.',
        });
        return;
      }

      const existingUser = await User.findByEmail(cleanEmail);
      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'An account with this email address already exists. Please log in.',
        });
        return;
      }

      // If registrationData with employeeId is provided, check uniqueness early
      if (effectiveRole === 'employee' && registrationData?.employeeId) {
        const cleanEmpId = registrationData.employeeId.trim();
        const existingEmp = await User.findByEmployeeId(cleanEmpId);
        if (existingEmp) {
          res.status(409).json({
            success: false,
            error: 'An account with this Employee ID already exists.',
          });
          return;
        }
      }

      // Generate 6-digit OTP code
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      await Otp.deleteForEmailAndPurpose(cleanEmail, 'register');

      await Otp.create({
        email: cleanEmail,
        otp,
        purpose: 'register',
        role: effectiveRole,
        registrationData: registrationData || null,
        createdAt: new Date(),
      });

      const recipientName = registrationData?.fullName || registrationData?.username || undefined;

      queueOtpEmail({
        to: cleanEmail,
        otp,
        purpose: 'register',
        role: effectiveRole,
        name: recipientName,
      });

      res.status(200).json({
        success: true,
        message: `A 6-digit verification code has been sent to ${cleanEmail}`,
      });
      return;
    }

    // Legacy fallback for OTP login
    if (effectivePurpose === 'login') {
      const cleanEmail = (email || '').toLowerCase().trim();
      const existingUser = await User.findByEmail(cleanEmail);
      if (!existingUser) {
        res.status(404).json({
          success: false,
          error: 'No account found with this email address.',
        });
        return;
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await Otp.deleteForEmailAndPurpose(cleanEmail, 'login');
      await Otp.create({
        email: cleanEmail,
        otp,
        purpose: 'login',
        role: effectiveRole,
        createdAt: new Date(),
      });

      queueOtpEmail({
        to: cleanEmail,
        otp,
        purpose: 'login',
        role: effectiveRole,
        name: existingUser.fullName || existingUser.username,
      });

      res.status(200).json({
        success: true,
        message: `A 6-digit verification code has been sent to ${cleanEmail}`,
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: 'Invalid OTP purpose specified.',
    });
  } catch (error: any) {
    console.error('[Auth Error] sendOtp failed:', error);
    next(error);
  }
};

/**
 * @desc    Verify OTP for Registration or Forgot Password
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, identifier, otp, purpose } = req.body;
    const effectivePurpose = purpose || 'register';

    if (!otp) {
      res.status(400).json({
        success: false,
        error: 'Please enter the 6-digit verification code.',
      });
      return;
    }

    const cleanOtp = otp.toString().trim();
    let targetEmail = (email || '').toLowerCase().trim();

    // If identifier was provided for forgot-password, look up the email
    if (!targetEmail && identifier) {
      const user = await User.findByUsernameOrEmail(identifier);
      if (user) {
        targetEmail = user.email;
      }
    }

    if (!targetEmail) {
      res.status(400).json({
        success: false,
        error: 'Please provide email or username.',
      });
      return;
    }

    // Look up active OTP record
    const otpRecord = await Otp.findOne({
      email: targetEmail,
      otp: cleanOtp,
      purpose: effectivePurpose,
    });

    if (!otpRecord) {
      res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code. Please request a new code.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Verification code confirmed successfully.',
      verifiedEmail: targetEmail,
    });
  } catch (error: any) {
    console.error('[Auth Error] verifyOtp failed:', error);
    next(error);
  }
};

// ─── ADMIN AUTH CONTROLLERS ──────────────────────────────────────────────────

/**
 * @desc    Register Admin Account (after Email OTP verification)
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username, email, password, fullName, otp } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({
        success: false,
        error: 'Please provide username, corporate email, and password',
      });
      return;
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.toLowerCase().trim();

    // A public registration form must never be enough to become an admin.
    // Operations can add approved addresses through the server environment.
    if (!isAllowedAdminEmail(cleanEmail)) {
      res.status(403).json({
        success: false,
        error: 'This email is not approved for administrator registration. Contact an existing administrator.',
      });
      return;
    }

    const usernameErr = validateUsernameRequirements(cleanUsername);
    if (usernameErr) {
      res.status(400).json({ success: false, error: usernameErr });
      return;
    }

    const pwdError = validatePasswordRequirements(password);
    if (pwdError) {
      res.status(400).json({ success: false, error: pwdError });
      return;
    }

    // Check unique username
    const existingUsername = await User.findByUsername(cleanUsername);
    if (existingUsername) {
      res.status(409).json({
        success: false,
        error: 'This username is already taken. Please choose a different username.',
      });
      return;
    }

    // Check unique email
    const existingEmail = await User.findByEmail(cleanEmail);
    if (existingEmail) {
      res.status(409).json({
        success: false,
        error: 'An account with this corporate email already exists.',
      });
      return;
    }

    if (!otp) {
      res.status(400).json({ success: false, error: 'Email verification is required before creating an administrator account.' });
      return;
    }

    const cleanOtp = otp.toString().trim();
    const otpRecord = await Otp.findOne({
      email: cleanEmail,
      otp: cleanOtp,
      purpose: 'register',
      role: 'admin',
    });

    if (!otpRecord) {
      res.status(400).json({
        success: false,
        error: 'Invalid or expired email verification code. Please verify your email.',
      });
      return;
    }

    await Otp.deleteForEmailAndPurpose(cleanEmail, 'register');

    const newAdmin = await User.create({
      username: cleanUsername,
      fullName: fullName?.trim() || cleanUsername,
      email: cleanEmail,
      password,
      role: 'admin',
    });

    const token = generateToken({
      userId: newAdmin.id,
      email: newAdmin.email,
      role: newAdmin.role,
    });

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      token,
      user: formatUserResponse(newAdmin),
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY' || error.code === 11000) {
      res.status(409).json({
        success: false,
        error: 'Username or email already exists. Please choose another.',
      });
      return;
    }
    next(error);
  }
};

/**
 * @desc    Login Admin using Username/Email and Password (NO OTP needed)
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username, email, identifier, password } = req.body;
    const loginId = (identifier || username || email || '').trim();

    if (!loginId || !password) {
      res.status(400).json({
        success: false,
        error: 'Please enter your username/email and password',
      });
      return;
    }

    const user = await User.findByUsernameOrEmail(loginId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid username/email or password',
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: 'Invalid username/email or password',
      });
      return;
    }

    if (user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'This account does not have administrator privileges.',
      });
      return;
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      success: true,
      message: 'Signed in successfully',
      token,
      user: formatUserResponse(user),
    });
  } catch (error: any) {
    next(error);
  }
};

// ─── EMPLOYEE AUTH CONTROLLERS ───────────────────────────────────────────────

/**
 * Helper to auto-generate sequential Employee IDs (e.g. EMP-11, EMP-12, EMP-13)
 */
export const generateNextEmployeeId = async (): Promise<string> => {
  const rows = await query<any[]>("SELECT employeeId FROM users WHERE employeeId IS NOT NULL AND employeeId != ''");
  
  let maxNumber = 10; // Start so first employee without custom ID gets EMP-11
  const regex = /^EMP-(\d+)$/i;

  for (const row of rows) {
    if (row.employeeId) {
      const match = String(row.employeeId).trim().match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }
  }

  const nextNumber = maxNumber + 1;
  const padded = nextNumber < 10 ? `0${nextNumber}` : `${nextNumber}`;
  return `EMP-${padded}`;
};

/**
 * @desc    Register Employee Account (after Email OTP verification)
 * @route   POST /api/auth/employee/register
 * @access  Public
 */
export const registerEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fullName, username, employeeId, email, password, department, phone, otp } = req.body;

    if (!fullName || !email || !password) {
      res.status(400).json({
        success: false,
        error: 'Please provide full name, work email, and password',
      });
      return;
    }

    if (!department || typeof department !== 'string' || !department.trim()) {
      res.status(400).json({
        success: false,
        error: 'Department is required. Please select a valid department.',
      });
      return;
    }

    const normDept = normalizeDepartment(department);
    if (!normDept) {
      res.status(400).json({
        success: false,
        error: `Invalid department. Allowed departments are: ${VALID_DEPARTMENTS.join(', ')}`,
      });
      return;
    }

    const cleanFullName = fullName.trim();
    const cleanUsername = (username || fullName || email.split('@')[0]).trim();
    const cleanEmail = email.toLowerCase().trim();

    const usernameErr = validateUsernameRequirements(cleanUsername);
    if (usernameErr) {
      res.status(400).json({ success: false, error: usernameErr });
      return;
    }

    const pwdError = validatePasswordRequirements(password);
    if (pwdError) {
      res.status(400).json({ success: false, error: pwdError });
      return;
    }

    // Check unique email
    const existingEmail = await User.findByEmail(cleanEmail);
    if (existingEmail) {
      res.status(409).json({
        success: false,
        error: 'An account with this work email already exists',
      });
      return;
    }

    // Check unique username
    const existingUsername = await User.findByUsername(cleanUsername);
    if (existingUsername) {
      res.status(409).json({
        success: false,
        error: 'This username is already taken. Please choose a different username.',
      });
      return;
    }

    // Auto-generate employee ID (EMP-11, EMP-12, EMP-13) if not supplied
    let cleanEmpId = (employeeId || '').trim();
    if (!cleanEmpId) {
      cleanEmpId = await generateNextEmployeeId();
    } else {
      const existingEmpId = await User.findByEmployeeId(cleanEmpId);
      if (existingEmpId) {
        cleanEmpId = await generateNextEmployeeId();
      }
    }

    if (!otp) {
      res.status(400).json({ success: false, error: 'Email verification is required before creating an employee account.' });
      return;
    }

    const cleanOtp = otp.toString().trim();
    const otpRecord = await Otp.findOne({
      email: cleanEmail,
      otp: cleanOtp,
      purpose: 'register',
      role: 'employee',
    });

    if (!otpRecord) {
      res.status(400).json({
        success: false,
        error: 'Invalid or expired email verification code. Please request a new code.',
      });
      return;
    }

    await Otp.deleteForEmailAndPurpose(cleanEmail, 'register');

    const newEmployee = await User.create({
      fullName: cleanFullName,
      username: cleanUsername,
      employeeId: cleanEmpId,
      email: cleanEmail,
      password,
      role: 'employee',
      department: normDept,
      phone: phone?.trim() || '',
    });

    const token = generateToken({
      userId: newEmployee.id,
      email: newEmployee.email,
      role: newEmployee.role,
      department: newEmployee.department,
    });

    res.status(201).json({
      success: true,
      message: 'Employee account created successfully',
      token,
      user: formatUserResponse(newEmployee),
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY' || error.code === 11000) {
      res.status(409).json({
        success: false,
        error: 'An account with this username, email, or employee ID already exists.',
      });
      return;
    }
    next(error);
  }
};

/**
 * @desc    Login Employee using Username/Email and Password (NO OTP needed)
 * @route   POST /api/auth/employee/login
 * @access  Public
 */
export const loginEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username, email, identifier, password } = req.body;
    const loginId = (identifier || username || email || '').trim();

    if (!loginId || !password) {
      res.status(400).json({
        success: false,
        error: 'Please provide your username/email and password',
      });
      return;
    }

    const user = await User.findByUsernameOrEmail(loginId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid username/email or password',
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: 'Invalid username/email or password',
      });
      return;
    }

    if (user.role === 'admin') {
      res.status(403).json({
        success: false,
        error: 'Administrator accounts must sign in through the Admin Portal.',
      });
      return;
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      department: user.department,
    });

    res.status(200).json({
      success: true,
      message: 'Signed in successfully',
      token,
      user: formatUserResponse(user),
    });
  } catch (error: any) {
    next(error);
  }
};

// ─── FORGOT PASSWORD & RESET PASSWORD ─────────────────────────────────────────

/**
 * @desc    Initiate Forgot Password - Send OTP to user's registered email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { identifier, email, username } = req.body;
    const lookupKey = (identifier || username || email || '').trim();

    if (!lookupKey) {
      res.status(400).json({
        success: false,
        error: 'Please enter your username or registered email address.',
      });
      return;
    }

    const user = await User.findByUsernameOrEmail(lookupKey);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'No account found with this username or email address.',
      });
      return;
    }

    const targetEmail = user.email;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Clean up old reset OTPs
    await Otp.deleteForEmailAndPurpose(targetEmail, 'forgot-password');

    // Store in DB with 10-minute expiry
    await Otp.create({
      email: targetEmail,
      otp,
      purpose: 'forgot-password',
      role: user.role,
      createdAt: new Date(),
    });

    queueOtpEmail({
      to: targetEmail,
      otp,
      purpose: 'forgot-password',
      role: user.role,
      name: user.fullName || user.username,
    });

    res.status(200).json({
      success: true,
      message: `A 6-digit password reset code has been sent to ${maskEmail(targetEmail)}`,
      email: targetEmail,
    });
  } catch (error: any) {
    console.error('[Auth Error] forgotPassword failed:', error);
    next(error);
  }
};

/**
 * @desc    Verify Reset Password OTP
 * @route   POST /api/auth/verify-reset-otp
 * @access  Public
 */
export const verifyResetOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { identifier, email, otp } = req.body;

    if (!otp) {
      res.status(400).json({
        success: false,
        error: 'Please enter the 6-digit verification code.',
      });
      return;
    }

    let targetEmail = (email || '').toLowerCase().trim();
    if (!targetEmail && identifier) {
      const user = await User.findByUsernameOrEmail(identifier);
      if (user) targetEmail = user.email;
    }

    if (!targetEmail) {
      res.status(400).json({
        success: false,
        error: 'Please provide email or username.',
      });
      return;
    }

    const cleanOtp = otp.toString().trim();
    const otpRecord = await Otp.findOne({
      email: targetEmail,
      otp: cleanOtp,
      purpose: 'forgot-password',
    });

    if (!otpRecord) {
      res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code. Please request a new code.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Reset code verified successfully.',
      verifiedEmail: targetEmail,
    });
  } catch (error: any) {
    console.error('[Auth Error] verifyResetOtp failed:', error);
    next(error);
  }
};

/**
 * @desc    Reset Password with Verified OTP
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { identifier, email, otp, newPassword } = req.body;

    if (!newPassword) {
      res.status(400).json({
        success: false,
        error: 'Please provide a new password.',
      });
      return;
    }

    const pwdErr = validatePasswordRequirements(newPassword);
    if (pwdErr) {
      res.status(400).json({ success: false, error: pwdErr });
      return;
    }

    let targetEmail = (email || '').toLowerCase().trim();
    let user: IUser | null = null;

    if (identifier) {
      user = await User.findByUsernameOrEmail(identifier);
      if (user) targetEmail = user.email;
    } else if (targetEmail) {
      user = await User.findByEmail(targetEmail);
    }

    if (!user || !targetEmail) {
      res.status(404).json({
        success: false,
        error: 'Account not found.',
      });
      return;
    }

    // Verify OTP record
    const cleanOtp = (otp || '').toString().trim();
    const otpRecord = await Otp.findOne({
      email: targetEmail,
      otp: cleanOtp,
      purpose: 'forgot-password',
    });

    if (!otpRecord) {
      res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code. Please request a new code.',
      });
      return;
    }

    // Hash new password securely
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Invalidate used reset OTPs
    await Otp.deleteForEmailAndPurpose(targetEmail, 'forgot-password');

    res.status(200).json({
      success: true,
      message: 'Your password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error: any) {
    console.error('[Auth Error] resetPassword failed:', error);
    next(error);
  }
};

// ─── PROFILE CONTROLLERS ─────────────────────────────────────────────────────

/**
 * @desc    Get Current Logged In Profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User account not found' });
      return;
    }

    res.status(200).json({
      success: true,
      user: formatUserResponse(user),
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * @desc    Update Profile Details
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { fullName, username, age, email, phone, employeeId, joiningDate, department, avatarUrl } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User account not found' });
      return;
    }

    // Check if new email is taken
    if (email && email.toLowerCase().trim() !== user.email) {
      const existingEmail = await User.findByEmail(email);
      if (existingEmail && existingEmail.id !== user.id) {
        res.status(409).json({ success: false, error: 'Email address is already in use' });
        return;
      }
      user.email = email.toLowerCase().trim();
    }

    // Check if new username is taken
    if (username && username.trim() !== user.username) {
      const existingUser = await User.findByUsername(username.trim());
      if (existingUser && existingUser.id !== user.id) {
        res.status(409).json({ success: false, error: 'Username is already taken' });
        return;
      }
      user.username = username.trim();
    }

    if (fullName !== undefined) user.fullName = fullName.trim();
    if (age !== undefined) user.age = Number(age) || 0;
    if (phone !== undefined) user.phone = phone.trim();
    if (employeeId !== undefined) user.employeeId = employeeId.trim();
    if (joiningDate !== undefined) user.joiningDate = joiningDate.trim();
    if (department !== undefined) {
      const requestedDepartment = typeof department === 'string' ? department.trim().toLowerCase() : '';
      if (requestedDepartment !== String(user.department || '').toLowerCase()) {
        res.status(403).json({
          success: false,
          error: 'Department cannot be changed after account creation.',
        });
        return;
      }
    }
    if (avatarUrl !== undefined) {
      let finalAvatarUrl = avatarUrl.trim();
      if (
        finalAvatarUrl &&
        (finalAvatarUrl.startsWith('data:') ||
          (!finalAvatarUrl.startsWith('http://') && !finalAvatarUrl.startsWith('https://')))
      ) {
        try {
          const uploadRes = await uploadProfileImage(finalAvatarUrl, user.id);
          finalAvatarUrl = uploadRes.url;
        } catch (uploadErr) {
          console.error('[Profile Upload] Cloudinary upload error:', uploadErr);
        }
      }
      user.avatarUrl = finalAvatarUrl;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: formatUserResponse(user),
    });
  } catch (error: any) {
    next(error);
  }
};
