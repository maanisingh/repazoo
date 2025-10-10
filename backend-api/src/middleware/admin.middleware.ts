import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { query } from '../config/database.js';

/**
 * Middleware to verify user has admin role
 * Must be used after authenticateToken middleware
 */
export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  try {
    // Check if user has admin role
    const result = await query<{ is_admin: boolean }>(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    if (!result.rows[0].is_admin) {
      res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify admin status',
    });
  }
};
