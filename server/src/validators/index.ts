import { Request, Response, NextFunction } from 'express';

export const VALID_DEPARTMENTS = ['sales', 'manager', 'packaging'] as const;
export type Department = (typeof VALID_DEPARTMENTS)[number];

export const normalizeDepartment = (dept: unknown): Department | null => {
  if (typeof dept !== 'string') return null;
  const normalized = dept.trim().toLowerCase();
  if ((VALID_DEPARTMENTS as readonly string[]).includes(normalized)) {
    return normalized as Department;
  }
  return null;
};

export const isValidDepartment = (dept: unknown): dept is Department => {
  return normalizeDepartment(dept) !== null;
};

/**
 * Express middleware to strictly validate employee department in registration API requests.
 * Rejects invalid, empty, or unapproved department values with 400 Bad Request.
 */
export const validateEmployeeDepartment = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { department } = req.body;

  if (department === undefined || department === null || typeof department !== 'string' || !department.trim()) {
    res.status(400).json({
      success: false,
      error: 'Department is required. Please select a valid department.',
      allowedDepartments: VALID_DEPARTMENTS,
    });
    return;
  }

  const normDept = normalizeDepartment(department);
  if (!normDept) {
    res.status(400).json({
      success: false,
      error: `Invalid department: "${department}". Allowed departments are: ${VALID_DEPARTMENTS.join(', ')}.`,
      allowedDepartments: VALID_DEPARTMENTS,
    });
    return;
  }

  // Ensure normalized department is passed down
  req.body.department = normDept;
  next();
};

