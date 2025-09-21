import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { queryOne } from '@/lib/postgres';

export interface AdminUser {
  userId: string;
  email: string;
  isAdmin: boolean;
  plan: string;
}

export class AdminAuthService {
  private static JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

  static async authenticateAdminRequest(request: NextRequest): Promise<AdminUser | null> {
    try {
      // Try to get token from cookie first, then Authorization header
      let token = request.cookies.get('admin-token')?.value;

      if (!token) {
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }

      if (!token) {
        return null;
      }

      // Verify and decode JWT token
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;

      if (!decoded.userId || !decoded.isAdmin) {
        return null;
      }

      // Verify user still exists and is admin
      const user = await queryOne(
        'SELECT id, email, first_name, last_name, plan, is_admin, is_active FROM simple_users WHERE id = $1 AND is_admin = true AND is_active = true',
        [decoded.userId]
      );

      if (!user) {
        return null;
      }

      return {
        userId: user.id,
        email: user.email,
        isAdmin: user.is_admin,
        plan: user.plan || 'ENTERPRISE'
      };
    } catch (error) {
      console.error('Admin authentication error:', error);
      return null;
    }
  }

  static generateAdminToken(payload: { userId: string; email: string; isAdmin: boolean; plan: string }): string {
    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: '8h' });
  }
}