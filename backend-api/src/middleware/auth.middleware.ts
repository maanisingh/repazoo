import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
  };
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid token.'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as {
      user_id: string;
      email: string;
    };

    req.user = {
      user_id: decoded.user_id,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expired. Please log in again.'
      });
      return;
    }

    res.status(403).json({
      success: false,
      error: 'Invalid token. Please log in again.'
    });
  }
};

/**
 * Optional authentication - attaches user if token is valid, but doesn't require it
 */
export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as {
      user_id: string;
      email: string;
    };

    req.user = {
      user_id: decoded.user_id,
      email: decoded.email,
    };
  } catch (error) {
    // Invalid token, but we don't care - just continue without auth
  }

  next();
};
