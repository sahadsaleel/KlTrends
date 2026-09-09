import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';

export const protect = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Not authorized. Token missing or invalid.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    const currentUser = await User.findById(decoded.userId);
    if (!currentUser) {
      res.status(401).json({ success: false, error: 'Account is no longer available.' });
      return;
    }
    req.user = {
      userId: currentUser.id,
      email: currentUser.email,
      role: currentUser.role,
      department: currentUser.department,
    };
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token. Please log in again.',
    });
  }
};

export const adminOnly = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      error: 'Forbidden. Admin privileges required.',
    });
  }
};

/**
 * Middleware to restrict route access to specific departments.
 * Admins are always granted access.
 */
export const requireDepartment = (
  ...allowedDepartments: string[]
) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authorized. Token missing or invalid.',
      });
      return;
    }

    // Admins always have access across all departments
    if (req.user.role === 'admin') {
      next();
      return;
    }

    let userDept = req.user.department?.toLowerCase();

    // Fallback: If department wasn't embedded in the token, fetch from DB
    if (!userDept) {
      try {
        const { User } = await import('../models/User.js');
        const dbUser = await User.findById(req.user.userId);
        if (dbUser && dbUser.department) {
          userDept = dbUser.department.toLowerCase();
          req.user.department = dbUser.department;
        }
      } catch (err) {
        console.error('Failed to resolve user department for route guard', err);
      }
    }

    const normalizedAllowed = allowedDepartments.map((d) => d.toLowerCase());

    if (userDept && normalizedAllowed.includes(userDept)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: `Forbidden. This operation is restricted to the ${allowedDepartments.join(', ')} department.`,
    });
  };
};
