import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { config } from '../config/env.js';
import type { User } from '../types/index.js';

export class AuthService {
  async registerUser(email: string, password: string, full_name: string): Promise<{ user_id: string; success: boolean; message?: string }> {
    try {
      // Check if user already exists
      const existingUser = await query<User>(
        'SELECT id FROM public.users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return {
          success: false,
          user_id: '',
          message: 'User with this email already exists',
        };
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Create user in auth.users
      const authResult = await query<{ id: string }>(
        `INSERT INTO auth.users (email, password_hash, created_at)
         VALUES ($1, $2, NOW())
         RETURNING id`,
        [email, password_hash]
      );

      const user_id = authResult.rows[0].id;

      // Create user in public.users (id is FK to auth.users.id)
      await query(
        `INSERT INTO public.users (id, email, display_name, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [user_id, email, full_name]
      );

      return {
        success: true,
        user_id,
        message: 'User registered successfully',
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        user_id: '',
        message: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  async loginUser(email: string, password: string): Promise<{ success: boolean; token?: string; user_id?: string; message?: string }> {
    try {
      // Get user with password hash and admin status (u.id is FK to auth.users.id)
      const result = await query<User & { password_hash: string; is_admin: boolean }>(
        `SELECT u.id, u.email, u.display_name as full_name, u.is_admin, u.subscription_tier, au.password_hash
         FROM public.users u
         JOIN auth.users au ON au.id = u.id
         WHERE u.email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      const user = result.rows[0];

      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);

      if (!isValid) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      // Generate JWT token with admin flag
      const token = jwt.sign(
        {
          user_id: user.id,
          email: user.email,
          subscription_tier: user.subscription_tier || 'free',
          is_admin: user.is_admin || false,
        },
        config.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        success: true,
        token,
        user_id: user.id,
        message: 'Login successful',
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  async requestPasswordReset(email: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Check if user exists
      const result = await query<User>(
        'SELECT id, email FROM public.users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        // Don't reveal if user exists or not
        return {
          success: true,
          message: 'If the email exists, a password reset link has been sent',
        };
      }

      // TODO: Generate reset token and send email
      // For now, just return success
      return {
        success: true,
        message: 'Password reset email sent',
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        message: 'Password reset failed',
      };
    }
  }

  verifyToken(token: string): { user_id: string; email: string; is_admin: boolean } | null {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as {
        user_id: string;
        email: string;
        subscription_tier: string;
        is_admin: boolean;
      };
      return {
        user_id: decoded.user_id,
        email: decoded.email,
        is_admin: decoded.is_admin || false,
      };
    } catch (error) {
      return null;
    }
  }
}

export const authService = new AuthService();
