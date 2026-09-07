import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';

/**
 * Format timestamp helper
 */
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// ─── ADMIN CONTROLLERS ────────────────────────────────────────────────────────

/**
 * @desc    Create and broadcast a notification or message
 * @route   POST /api/admin/notifications
 * @access  Private (Admin only)
 */
export const createNotification = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      title,
      message,
      priority = 'normal',
      targetType = 'all',
      targetId,
      targetLabel,
      type = 'broadcast',
    } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ success: false, error: 'Notification title is required.' });
      return;
    }

    if (!message || !message.trim()) {
      res.status(400).json({ success: false, error: 'Notification message is required.' });
      return;
    }

    // Get admin user info
    let senderName = 'Management';
    if (req.user?.userId) {
      const adminUser = await User.findById(req.user.userId);
      if (adminUser) {
        senderName = adminUser.fullName || adminUser.username || 'Admin';
      }
    }

    let resolvedTargetLabel = targetLabel;
    if (!resolvedTargetLabel) {
      if (targetType === 'all') {
        const totalEmployees = await User.countNonAdmins();
        resolvedTargetLabel = `All Staff (${totalEmployees})`;
      } else if (targetType === 'department') {
        resolvedTargetLabel = `${targetId || 'All'} Department`;
      } else if (targetType === 'employee') {
        resolvedTargetLabel = 'Specific Employee';
      }
    }

    const newNotification = await Notification.create({
      senderId: req.user?.userId || undefined,
      senderName,
      title: title.trim(),
      message: message.trim(),
      type,
      priority,
      targetType,
      targetId: targetId ? String(targetId).trim() : undefined,
      targetLabel: resolvedTargetLabel,
      readBy: [],
    });

    res.status(201).json({
      success: true,
      message: 'Notification sent successfully!',
      data: {
        id: newNotification.id,
        title: newNotification.title,
        message: newNotification.message,
        type: newNotification.type,
        priority: newNotification.priority,
        targetType: newNotification.targetType,
        targetId: newNotification.targetId,
        targetLabel: newNotification.targetLabel,
        senderName: newNotification.senderName,
        createdAt: 'Just now',
        readCount: 0,
      },
    });
  } catch (error: any) {
    console.error('Error creating notification:', error);
    res.status(500).json({ success: false, error: error.message || 'Error sending notification' });
  }
};

/**
 * @desc    Get all notifications created by admins
 * @route   GET /api/admin/notifications
 * @access  Private (Admin only)
 */
export const getAdminNotifications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const notifications = await Notification.find();

    const formatted = notifications.map((item) => ({
      id: item.id,
      title: item.title,
      message: item.message,
      type: item.type,
      priority: item.priority,
      targetType: item.targetType,
      targetId: item.targetId,
      targetLabel: item.targetLabel,
      senderName: item.senderName,
      createdAt: formatTimeAgo(item.createdAt),
      fullCreatedAt: item.createdAt,
      readCount: item.readBy ? item.readBy.length : 0,
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({ success: false, error: error.message || 'Error fetching notifications' });
  }
};

/**
 * @desc    Delete a notification
 * @route   DELETE /api/admin/notifications/:id
 * @access  Private (Admin only)
 */
export const deleteNotification = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      res.status(400).json({ success: false, error: 'Invalid notification ID.' });
      return;
    }

    const deleted = await Notification.findByIdAndDelete(id);

    if (!deleted) {
      res.status(404).json({ success: false, error: 'Notification not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully.',
    });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, error: error.message || 'Error deleting notification' });
  }
};

// ─── EMPLOYEE CONTROLLERS ─────────────────────────────────────────────────────

/**
 * @desc    Get all notifications applicable to the logged-in employee
 * @route   GET /api/notifications
 * @access  Private
 */
export const getEmployeeNotifications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User unauthorized.' });
      return;
    }

    // Fetch user details to know department & employeeId
    const user = await User.findById(userId);
    const userDept = user?.department || '';
    const employeeId = user?.employeeId || '';

    const targetConditions: any[] = [{ targetType: 'all' }];

    if (userDept) {
      targetConditions.push({
        targetType: 'department',
        targetId: userDept,
      });
    }

    // Match either user ID or employeeId
    const userIdentifiers = [userId, employeeId].filter(Boolean);
    if (userIdentifiers.length > 0) {
      targetConditions.push({
        targetType: 'employee',
        targetIds: userIdentifiers,
      });
    }

    const notifications = await Notification.find({
      recipients: targetConditions,
    });

    const formatted = notifications.map((n) => {
      const receipt = n.readBy?.find((r) => r.userId === userId);
      const isRead = !!receipt;

      return {
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        priority: n.priority,
        targetType: n.targetType,
        targetId: n.targetId,
        targetLabel: n.targetLabel,
        senderName: n.senderName,
        createdAt: formatTimeAgo(n.createdAt),
        fullCreatedAt: n.createdAt,
        isRead,
        readAt: receipt ? receipt.readAt : null,
      };
    });

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    console.error('Error fetching employee notifications:', error);
    res.status(500).json({ success: false, error: error.message || 'Error fetching notifications' });
  }
};

/**
 * @desc    Get count of unread notifications for employee
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
export const getUnreadCount = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User unauthorized.' });
      return;
    }

    const user = await User.findById(userId);
    const userDept = user?.department || '';
    const employeeId = user?.employeeId || '';

    const targetConditions: any[] = [{ targetType: 'all' }];

    if (userDept) {
      targetConditions.push({
        targetType: 'department',
        targetId: userDept,
      });
    }

    const userIdentifiers = [userId, employeeId].filter(Boolean);
    if (userIdentifiers.length > 0) {
      targetConditions.push({
        targetType: 'employee',
        targetIds: userIdentifiers,
      });
    }

    const unreadCount = await Notification.count({
      recipients: targetConditions,
      unreadForUser: userId,
    });

    res.status(200).json({
      success: true,
      data: { count: unreadCount },
    });
  } catch (error: any) {
    console.error('Error getting unread notification count:', error);
    res.status(500).json({ success: false, error: error.message || 'Error calculating count' });
  }
};

/**
 * @desc    Mark a single notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
export const markAsRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User unauthorized.' });
      return;
    }

    if (!id || typeof id !== 'string') {
      res.status(400).json({ success: false, error: 'Invalid notification ID.' });
      return;
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      res.status(404).json({ success: false, error: 'Notification not found.' });
      return;
    }

    const alreadyRead = notification.readBy.some((r) => r.userId === userId);

    if (!alreadyRead) {
      notification.readBy.push({
        userId,
        readAt: new Date(),
      });
      await notification.save();
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
    });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, error: error.message || 'Error updating status' });
  }
};

/**
 * @desc    Mark all user's notifications as read
 * @route   POST /api/notifications/mark-all-read
 * @access  Private
 */
export const markAllAsRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User unauthorized.' });
      return;
    }

    const user = await User.findById(userId);
    const userDept = user?.department || '';
    const employeeId = user?.employeeId || '';

    const targetConditions: any[] = [{ targetType: 'all' }];
    if (userDept) {
      targetConditions.push({
        targetType: 'department',
        targetId: userDept,
      });
    }
    const userIdentifiers = [userId, employeeId].filter(Boolean);
    if (userIdentifiers.length > 0) {
      targetConditions.push({
        targetType: 'employee',
        targetIds: userIdentifiers,
      });
    }

    // Find all unread notifications for this user
    const allNotifs = await Notification.find({
      recipients: targetConditions,
    });

    const unreadNotifs = allNotifs.filter((n) => !n.readBy.some((r) => r.userId === userId));

    // Update each with read receipt
    const now = new Date();
    await Promise.all(
      unreadNotifs.map(async (n) => {
        n.readBy.push({ userId, readAt: now });
        return n.save();
      })
    );

    res.status(200).json({
      success: true,
      message: `Marked ${unreadNotifs.length} notification(s) as read.`,
      data: { markedCount: unreadNotifs.length },
    });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, error: error.message || 'Error updating all' });
  }
};
