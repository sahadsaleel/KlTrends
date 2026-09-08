import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { User } from '../models/User.js';
import { Attendance } from '../models/Attendance.js';
import { Report } from '../models/Report.js';
import { uploadProfileImage } from '../services/cloudinaryService.js';
import { normalizeDepartment, VALID_DEPARTMENTS } from '../validators/index.js';

// Helper: format YYYY-MM-DD
const formatDateString = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * @desc    Get admin dashboard aggregate stats
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin only)
 */
export const getDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const todayStr = formatDateString(now);
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    // Total employees (non-admin users)
    const totalEmployees = await User.countNonAdmins();

    // Today's attendance
    const todayAttendance = await Attendance.findByDate(todayStr);
    const presentToday = todayAttendance.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'HALF_DAY'
    ).length;
    const lateToday = todayAttendance.filter((a) => a.status === 'LATE').length;
    const absentToday = Math.max(0, totalEmployees - presentToday);

    // Monthly sales
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    const startStr = formatDateString(startOfMonth);
    const endStr = formatDateString(endOfMonth);

    const monthlyReports = await Report.findInDateRange(startStr, endStr);
    const totalMonthlySales = monthlyReports.reduce((sum, r) => sum + r.totalSalesAmount, 0);
    const totalMonthlyWhatsappEnquiries = monthlyReports.reduce(
      (sum, r) => sum + r.whatsappEnquiries,
      0
    );
    const totalMonthlyTotalOrders = monthlyReports.reduce(
      (sum, r) => sum + r.totalOrders,
      0
    );
    const totalMonthlyCompletedOrders = monthlyReports.reduce(
      (sum, r) => sum + r.completedOrders,
      0
    );
    const totalMonthlyCancelledOrders = monthlyReports.reduce(
      (sum, r) => sum + r.cancelledOrders,
      0
    );
    const totalMonthlyCodOrders = monthlyReports.reduce(
      (sum, r) => sum + r.codOrders,
      0
    );
    const totalMonthlyPrepaidOrders = monthlyReports.reduce(
      (sum, r) => sum + r.prepaidOrders,
      0
    );

    // Top performers (top 5 employees by monthly sales)
    const salesByUser = new Map<string, number>();
    monthlyReports.forEach((r) => {
      const uid = r.userId.toString();
      salesByUser.set(uid, (salesByUser.get(uid) || 0) + r.totalSalesAmount);
    });

    const sortedSales = Array.from(salesByUser.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topPerformerIds = sortedSales.map((s) => s[0]);
    const topUsers = await User.findByIds(topPerformerIds);

    const topPerformers = sortedSales.map(([userId, totalSales]) => {
      const user = topUsers.find((u) => u.id.toString() === userId);
      return {
        userId,
        fullName: user?.fullName || user?.username || 'Unknown',
        employeeId: user?.employeeId || '--',
        department: user?.department || '--',
        avatarUrl: user?.avatarUrl,
        totalSales,
      };
    });

    // Find early checkouts today (checked out before 5:30 PM (17:30) or has earlyCheckoutReason)
    const earlyAttendances = todayAttendance.filter((a) => {
      if (!a.checkOutTime) return false;
      const outDate = new Date(a.checkOutTime);
      const isBefore530 = outDate.getHours() < 17 || (outDate.getHours() === 17 && outDate.getMinutes() < 30);
      return isBefore530 || Boolean(a.earlyCheckoutReason);
    });

    const earlyUserIds = [...new Set(earlyAttendances.map((a) => a.userId.toString()))];
    const earlyUsers = earlyUserIds.length > 0 ? await User.findByIds(earlyUserIds) : [];
    const earlyUserMap = new Map(earlyUsers.map((u) => [u.id.toString(), u]));

    const earlyCheckouts = earlyAttendances
      .map((a) => {
        const user = earlyUserMap.get(a.userId.toString());
        const checkOutDate = a.checkOutTime ? new Date(a.checkOutTime) : null;
        const checkInDate = a.checkInTime ? new Date(a.checkInTime) : null;
        return {
          id: a.id,
          userId: a.userId,
          fullName: user?.fullName || user?.username || 'Unknown Employee',
          employeeId: user?.employeeId || '--',
          department: user?.department || 'General',
          avatarUrl: user?.avatarUrl,
          checkInTime: checkInDate
            ? checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : null,
          checkOutTime: a.checkOutTime ? a.checkOutTime.toISOString() : '',
          checkOutTimeFormatted: checkOutDate
            ? checkOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '--',
          reason: a.earlyCheckoutReason || 'Left before 5:30 PM (No specific reason provided)',
          workDurationMinutes: a.workDurationMinutes,
        };
      })
      .sort((a, b) => new Date(b.checkOutTime).getTime() - new Date(a.checkOutTime).getTime());

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        presentToday,
        absentToday,
        lateToday,
        totalMonthlySales,
        totalMonthlyWhatsappEnquiries,
        totalMonthlyTotalOrders,
        totalMonthlyCompletedOrders,
        totalMonthlyCancelledOrders,
        totalMonthlyCodOrders,
        totalMonthlyPrepaidOrders,
        currentMonth: monthNames[month],
        currentYear: year,
        topPerformers,
        earlyCheckouts,
      },
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, error: error.message || 'Error fetching dashboard stats' });
  }
};

/**
 * @desc    Get all employees with their latest attendance status
 * @route   GET /api/admin/employees
 * @access  Private (Admin only)
 */
export const getAllEmployees = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const todayStr = formatDateString(now);

    // Fetch all non-admin users
    const employees = await User.findAllNonAdmins();

    // Get today's attendance for all users in one query
    const todayAttendance = await Attendance.findByDate(todayStr);
    const attendanceMap = new Map(
      todayAttendance.map((a) => [a.userId.toString(), a])
    );

    const employeeList = employees.map((emp) => {
      const attendance = attendanceMap.get(emp.id);
      return {
        id: emp.id,
        fullName: emp.fullName || emp.username || 'Unknown',
        employeeId: emp.employeeId || '--',
        email: emp.email,
        department: emp.department || '--',
        phone: emp.phone || '--',
        age: emp.age ?? null,
        joiningDate: emp.joiningDate || '--',
        role: emp.role,
        avatarUrl: emp.avatarUrl,
        todayStatus: attendance
          ? attendance.status
          : 'ABSENT' as const,
        selfieUrl: attendance?.selfieUrl || null,
        isVerified: attendance?.isVerified || false,
        earlyCheckoutReason: attendance?.earlyCheckoutReason || null,
        checkInTime: attendance?.checkInTime
          ? new Date(attendance.checkInTime).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
          : null,
        checkOutTime: attendance?.checkOutTime
          ? new Date(attendance.checkOutTime).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
          : null,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        employees: employeeList,
        totalCount: employeeList.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ success: false, error: error.message || 'Error fetching employees' });
  }
};

/**
 * @desc    Get all sales reports across all employees for a given month
 * @route   GET /api/admin/reports?month=&year=
 * @access  Private (Admin only)
 */
export const getAllEmployeeReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const year = req.query.year ? parseInt(req.query.year as string) : now.getFullYear();
    const month = req.query.month ? parseInt(req.query.month as string) - 1 : now.getMonth();

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    const startStr = formatDateString(startOfMonth);
    const endStr = formatDateString(endOfMonth);

    // Fetch all reports for the month and populate user info
    const reports = await Report.findInDateRange(startStr, endStr);

    // Get user details for all reports
    const userIds = [...new Set(reports.map((r) => r.userId.toString()))];
    const users = await User.findByIds(userIds);
    const userMap = new Map(users.map((u) => [u.id.toString(), u]));

    const totalSales = reports.reduce((sum, r) => sum + r.totalSalesAmount, 0);
    const totalWhatsappEnquiries = reports.reduce((sum, r) => sum + r.whatsappEnquiries, 0);
    const totalOrders = reports.reduce((sum, r) => sum + r.totalOrders, 0);
    const totalCompletedOrders = reports.reduce((sum, r) => sum + r.completedOrders, 0);
    const totalCancelledOrders = reports.reduce((sum, r) => sum + r.cancelledOrders, 0);
    const totalCodOrders = reports.reduce((sum, r) => sum + r.codOrders, 0);
    const totalPrepaidOrders = reports.reduce((sum, r) => sum + r.prepaidOrders, 0);

    // Group sales by employee
    const salesByEmployee: Array<{
      userId: string;
      fullName: string;
      employeeId: string;
      department: string;
      avatarUrl?: string;
      totalSales: number;
      totalWhatsappEnquiries: number;
      totalOrders: number;
      totalCompletedOrders: number;
      totalCancelledOrders: number;
      totalCodOrders: number;
      totalPrepaidOrders: number;
      reportCount: number;
    }> = [];

    const employeeSalesMap = new Map<string, {
      totalSales: number;
      totalWhatsappEnquiries: number;
      totalOrders: number;
      totalCompletedOrders: number;
      totalCancelledOrders: number;
      totalCodOrders: number;
      totalPrepaidOrders: number;
      reportCount: number;
    }>();
    reports.forEach((r) => {
      const uid = r.userId.toString();
      const existing = employeeSalesMap.get(uid) || {
        totalSales: 0,
        totalWhatsappEnquiries: 0,
        totalOrders: 0,
        totalCompletedOrders: 0,
        totalCancelledOrders: 0,
        totalCodOrders: 0,
        totalPrepaidOrders: 0,
        reportCount: 0,
      };
      existing.totalSales += r.totalSalesAmount;
      existing.totalWhatsappEnquiries += r.whatsappEnquiries;
      existing.totalOrders += r.totalOrders;
      existing.totalCompletedOrders += r.completedOrders;
      existing.totalCancelledOrders += r.cancelledOrders;
      existing.totalCodOrders += r.codOrders;
      existing.totalPrepaidOrders += r.prepaidOrders;
      existing.reportCount += 1;
      employeeSalesMap.set(uid, existing);
    });

    employeeSalesMap.forEach((val, uid) => {
      const user = userMap.get(uid);
      salesByEmployee.push({
        userId: uid,
        fullName: user?.fullName || user?.username || 'Unknown',
        employeeId: user?.employeeId || '--',
        department: user?.department || '--',
        avatarUrl: user?.avatarUrl,
        totalSales: val.totalSales,
        totalWhatsappEnquiries: val.totalWhatsappEnquiries,
        totalOrders: val.totalOrders,
        totalCompletedOrders: val.totalCompletedOrders,
        totalCancelledOrders: val.totalCancelledOrders,
        totalCodOrders: val.totalCodOrders,
        totalPrepaidOrders: val.totalPrepaidOrders,
        reportCount: val.reportCount,
      });
    });

    // Sort by totalSales descending
    salesByEmployee.sort((a, b) => b.totalSales - a.totalSales);

    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    res.status(200).json({
      success: true,
      data: {
        reports,
        salesByEmployee,
        summary: {
          totalSales,
          totalWhatsappEnquiries,
          totalOrders,
          totalCompletedOrders,
          totalCancelledOrders,
          totalCodOrders,
          totalPrepaidOrders,
          totalReports: reports.length,
          month: monthNames[month],
          year,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin reports:', error);
    res.status(500).json({ success: false, error: error.message || 'Error fetching reports' });
  }
};

/**
 * @desc    Create a new employee
 * @route   POST /api/admin/employees
 * @access  Private (Admin only)
 */
export const createEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { fullName, employeeId, email, password, department, phone, age, joiningDate, avatarUrl } = req.body;

    if (!fullName || !employeeId || !email) {
      res.status(400).json({
        success: false,
        error: 'Please provide full name, employee ID, and email.',
      });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanEmpId = employeeId.trim();

    const existingEmail = await User.findByEmail(cleanEmail);
    if (existingEmail) {
      res.status(409).json({ success: false, error: 'An account with this email already exists.' });
      return;
    }

    const existingEmpId = await User.findByEmployeeId(cleanEmpId);
    if (existingEmpId) {
      res.status(409).json({ success: false, error: 'An account with this Employee ID already exists.' });
      return;
    }

    let finalAvatarUrl = avatarUrl ? avatarUrl.trim() : '';
    if (
      finalAvatarUrl &&
      (finalAvatarUrl.startsWith('data:') ||
        (!finalAvatarUrl.startsWith('http://') && !finalAvatarUrl.startsWith('https://')))
    ) {
      try {
        const uploadRes = await uploadProfileImage(finalAvatarUrl, cleanEmpId);
        finalAvatarUrl = uploadRes.url;
      } catch (err) {
        console.error('[Admin Create] Cloudinary avatar upload failed:', err);
      }
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

    const newEmployee = await User.create({
      fullName: fullName.trim(),
      username: fullName.trim(),
      employeeId: cleanEmpId,
      email: cleanEmail,
      password: password && password.length >= 6 ? password : 'Password123!',
      role: 'employee',
      department: normDept,
      phone: phone?.trim() || '',
      age: age ? Number(age) : undefined,
      joiningDate: joiningDate?.trim() || formatDateString(new Date()),
      avatarUrl: finalAvatarUrl || undefined,
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully!',
      data: {
        id: newEmployee.id,
        fullName: newEmployee.fullName,
        employeeId: newEmployee.employeeId,
        email: newEmployee.email,
        department: newEmployee.department,
        phone: newEmployee.phone,
        joiningDate: newEmployee.joiningDate,
        role: newEmployee.role,
        avatarUrl: newEmployee.avatarUrl,
        todayStatus: 'ABSENT',
        selfieUrl: null,
        isVerified: false,
        checkInTime: null,
        checkOutTime: null,
      },
    });
  } catch (error: any) {
    console.error('Error creating employee:', error);
    res.status(500).json({ success: false, error: error.message || 'Error creating employee' });
  }
};

/**
 * @desc    Update an existing employee
 * @route   PUT /api/admin/employees/:id
 * @access  Private (Admin only)
 */
export const updateEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      res.status(400).json({ success: false, error: 'Invalid employee ID' });
      return;
    }

    const user = await User.findById(id);
    if (!user || user.role === 'admin') {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    const { fullName, employeeId, email, department, phone, age, joiningDate, avatarUrl } = req.body;

    if (email && email.toLowerCase().trim() !== user.email) {
      const existingEmail = await User.findByEmail(email.toLowerCase().trim());
      if (existingEmail) {
        res.status(409).json({ success: false, error: 'Email is already taken by another account.' });
        return;
      }
      user.email = email.toLowerCase().trim();
    }

    if (employeeId && employeeId.trim() !== user.employeeId) {
      const existingEmpId = await User.findByEmployeeId(employeeId.trim());
      if (existingEmpId) {
        res.status(409).json({ success: false, error: 'Employee ID is already taken.' });
        return;
      }
      user.employeeId = employeeId.trim();
    }

    if (fullName !== undefined) user.fullName = fullName.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (department !== undefined) {
      const normDept = normalizeDepartment(department);
      if (!normDept) {
        res.status(400).json({
          success: false,
          error: `Invalid department. Allowed departments are: ${VALID_DEPARTMENTS.join(', ')}`,
        });
        return;
      }
      user.department = normDept;
    }
    if (age !== undefined) user.age = Number(age) || 0;
    if (joiningDate !== undefined) user.joiningDate = joiningDate.trim();
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
        } catch (err) {
          console.error('[Admin Update] Cloudinary avatar upload failed:', err);
        }
      }
      user.avatarUrl = finalAvatarUrl;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully!',
      data: {
        id: user.id,
        fullName: user.fullName,
        employeeId: user.employeeId,
        email: user.email,
        department: user.department,
        phone: user.phone,
        joiningDate: user.joiningDate,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error: any) {
    console.error('Error updating employee:', error);
    res.status(500).json({ success: false, error: error.message || 'Error updating employee' });
  }
};

/**
 * @desc    Delete an employee and their records
 * @route   DELETE /api/admin/employees/:id
 * @access  Private (Admin only)
 */
export const deleteEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      res.status(400).json({ success: false, error: 'Invalid employee ID' });
      return;
    }

    const user = await User.findById(id);
    if (!user || user.role === 'admin') {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    // Delete user and associated attendance + reports
    await User.findByIdAndDelete(id);
    await Attendance.deleteByUser(id);
    await Report.deleteByUser(id);

    res.status(200).json({
      success: true,
      message: `Employee ${user.fullName || user.email} deleted successfully.`,
    });
  } catch (error: any) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ success: false, error: error.message || 'Error deleting employee' });
  }
};
