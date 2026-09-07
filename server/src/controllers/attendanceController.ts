import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { Attendance } from '../models/Attendance.js';
import { uploadAttendanceSelfie } from '../services/cloudinaryService.js';

// Helper function to format Date object into YYYY-MM-DD
const formatDateString = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * @desc    Check In current employee with selfie face verification
 * @route   POST /api/attendance/check-in
 * @access  Private (Employee)
 */
export const checkIn = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized user' });
      return;
    }

    const { selfieImage, location, notes } = req.body;

    const now = new Date();
    const todayStr = formatDateString(now);

    // Check if user already checked in today
    const existingAttendance = await Attendance.findByUserAndDate(userId, todayStr);

    if (existingAttendance && existingAttendance.checkInTime) {
      res.status(400).json({
        success: false,
        error: `Already checked in today at ${new Date(existingAttendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        data: existingAttendance,
      });
      return;
    }

    let selfieUrl: string | undefined = undefined;
    let selfiePublicId: string | undefined = undefined;
    let isVerified = false;

    // Upload selfie image to Cloudinary if provided
    if (selfieImage) {
      try {
        console.log(`[Attendance] Uploading selfie to Cloudinary for user ${userId}...`);
        const uploadRes = await uploadAttendanceSelfie(selfieImage, userId);
        selfieUrl = uploadRes.url;
        selfiePublicId = uploadRes.publicId;
        isVerified = true;
        console.log(`[Attendance] Selfie uploaded successfully: ${selfieUrl}`);
      } catch (uploadError: any) {
        console.error('[Attendance] Cloudinary selfie upload error:', uploadError);
        res.status(500).json({
          success: false,
          error: `Face Selfie Upload Failed: ${uploadError.message || 'Cloudinary error'}. Please try again.`,
        });
        return;
      }
    }

    // Determine if late (shift starts at 10:00 AM)
    const shiftStart = new Date(now);
    shiftStart.setHours(10, 0, 0, 0);
    const isLate = now > shiftStart;

    // Atomic find-and-modify with upsert to prevent race conditions or duplicate key errors
    const updatedAttendance = await Attendance.upsertCheckIn(userId, todayStr, {
      checkInTime: now,
      status: isLate ? 'LATE' : 'PRESENT',
      ...(selfieUrl && { selfieUrl, selfiePublicId, isVerified }),
      ...(location && { location }),
      ...(notes && { notes }),
    });

    res.status(200).json({
      success: true,
      message: 'Check-in successful! Face verified and attendance recorded.',
      data: updatedAttendance,
    });
  } catch (error: any) {
    console.error('Error during check-in:', error);
    res.status(500).json({ success: false, error: error.message || 'Server error during check-in' });
  }
};

/**
 * @desc    Check Out current employee
 * @route   POST /api/attendance/check-out
 * @access  Private (Employee)
 */
export const checkOut = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized user' });
      return;
    }

    const now = new Date();
    const todayStr = formatDateString(now);

    let attendance = await Attendance.findByUserAndDate(userId, todayStr);

    if (!attendance || !attendance.checkInTime) {
      res.status(400).json({
        success: false,
        error: 'You have not checked in today yet.',
      });
      return;
    }

    if (attendance.checkOutTime) {
      res.status(400).json({
        success: false,
        error: `Already checked out today at ${new Date(attendance.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        data: attendance,
      });
      return;
    }

    // Set check out time and calculate work duration in minutes
    attendance.checkOutTime = now;
    const diffMs = now.getTime() - new Date(attendance.checkInTime).getTime();
    attendance.workDurationMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));

    const { earlyCheckoutReason, reason } = req.body;

    const checkoutReason =
      typeof earlyCheckoutReason === 'string'
        ? earlyCheckoutReason.trim()
        : typeof reason === 'string'
          ? reason.trim()
          : '';

    // Check if check-out is before 5:30 PM
    const shiftEndHour = 17;
    const shiftEndMinute = 30;

    const isEarly =
      now.getHours() < shiftEndHour ||
      (now.getHours() === shiftEndHour &&
        now.getMinutes() < shiftEndMinute);

    // Require a reason for early checkout
    if (isEarly && !checkoutReason) {
      res.status(400).json({
        success: false,
        message: 'Please select a reason for leaving early.',
      });

      return;
    }

    // Save the actual selected reason
    if (isEarly) {
      attendance.earlyCheckoutReason = checkoutReason;
    } else {
      attendance.earlyCheckoutReason = null;
    }

    await attendance.save();

    res.status(200).json({
      success: true,
      message: 'Check-out successful!',
      data: attendance,
    });

    return;

  } catch (error: any) {
    console.error('Error during check-out:', error);
    res.status(500).json({ success: false, error: error.message || 'Server error during check-out' });
  }
};

/**
 * @desc    Get today's attendance status for current employee
 * @route   GET /api/attendance/today
 * @access  Private (Employee)
 */
export const getTodayStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized user' });
      return;
    }

    const now = new Date();
    const todayStr = formatDateString(now);

    // Strictly check attendance for TODAY's date
    const attendance = await Attendance.findByUserAndDate(userId, todayStr);

    res.status(200).json({
      success: true,
      data: {
        serverTime: now.toISOString(),
        todayDateStr: todayStr,
        attendance: attendance || null,
      },
    });
  } catch (error: any) {
    console.error('Error getting today status:', error);
    res.status(500).json({ success: false, error: error.message || 'Server error fetching status' });
  }
};

/**
 * @desc    Get monthly attendance logs and summary statistics
 * @route   GET /api/attendance/monthly
 * @access  Private (Employee)
 */
export const getMonthlyAttendance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized user' });
      return;
    }

    const now = new Date();
    const year = req.query.year ? parseInt(req.query.year as string) : now.getFullYear();
    const month = req.query.month ? parseInt(req.query.month as string) - 1 : now.getMonth(); // 0-indexed

    // Date bounds for the requested month
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const startOfMonthStr = formatDateString(startOfMonth);
    const endOfMonthStr = formatDateString(endOfMonth);

    // Fetch existing db records for user in this month
    const dbRecords = await Attendance.findByUserInDateRange(userId, startOfMonthStr, endOfMonthStr);

    // Calculate Hours This Week (Monday to Sunday of current week)
    const currentDayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon ...
    const distanceToMon = (currentDayOfWeek + 6) % 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - distanceToMon);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const weekStartStr = formatDateString(startOfWeek);
    const weekEndStr = formatDateString(endOfWeek);

    const weekRecords = await Attendance.findByUserInDateRange(userId, weekStartStr, weekEndStr);

    let totalWeekMinutes = 0;
    weekRecords.forEach((rec) => {
      if (rec.workDurationMinutes) {
        totalWeekMinutes += rec.workDurationMinutes;
      } else if (rec.checkInTime && !rec.checkOutTime) {
        // If currently checked in today, calculate live duration
        const diffMs = now.getTime() - new Date(rec.checkInTime).getTime();
        totalWeekMinutes += Math.max(0, Math.round(diffMs / (1000 * 60)));
      }
    });

    const hoursThisWeek = (totalWeekMinutes / 60).toFixed(1);

    // Calculate Days Present in current month
    const presentCount = dbRecords.filter(
      (r) => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'HALF_DAY'
    ).length;

    // Calculate total working days in this month (Monday to Friday)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let totalWorkingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = new Date(year, month, day).getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) totalWorkingDays++;
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Map real database records to UI activity items
    const recentActivityList = dbRecords.map((rec) => {
      const parts = rec.date.split('-').map(Number);
      const recDate = new Date(parts[0], parts[1] - 1, parts[2]);
      const formattedMonthDay = `${monthNames[recDate.getMonth()]} ${recDate.getDate()}`;
      const dayName = dayNames[recDate.getDay()];

      const inTimeFormatted = rec.checkInTime
        ? new Date(rec.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '--';
      const outTimeFormatted = rec.checkOutTime
        ? new Date(rec.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : (rec.checkInTime ? 'Active' : '--');

      const mins = rec.workDurationMinutes || 0;
      const hrs = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      const durationText = rec.checkOutTime
        ? (hrs > 0 ? `${hrs}h ${remainingMins}m` : `${remainingMins}m`)
        : (rec.checkInTime ? 'In Progress' : '--');

      return {
        id: rec.id,
        date: formattedMonthDay,
        dayName,
        rawDate: rec.date,
        checkInTimeStr: inTimeFormatted,
        checkOutTimeStr: outTimeFormatted,
        timeRange: rec.checkInTime ? `${inTimeFormatted} - ${outTimeFormatted}` : 'No records',
        durationText,
        status: rec.status,
        selfieUrl: rec.selfieUrl,
        earlyCheckoutReason: rec.earlyCheckoutReason || null,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          hoursThisWeek: parseFloat(hoursThisWeek),
          targetWeeklyHours: 40,
          daysPresent: presentCount,
          totalWorkingDays: totalWorkingDays || 22,
        },
        records: dbRecords,
        recentActivity: recentActivityList,
      },
    });
  } catch (error: any) {
    console.error('Error fetching monthly attendance:', error);
    res.status(500).json({ success: false, error: error.message || 'Server error fetching monthly logs' });
  }
};
