import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

export interface JWTPayload {
  userId: string;
  email: string;
  isAdmin: boolean;
  plan: string;
}

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });
  }

  static verifyToken(token: string): JWTPayload | null {
    try {
      console.log('Verifying token with secret:', this.JWT_SECRET.substring(0, 10) + '...');
      const result = jwt.verify(token, this.JWT_SECRET) as JWTPayload;
      console.log('Token verification successful:', result.userId);
      return result;
    } catch (error) {
      console.log('Token verification failed:', error.message);
      return null;
    }
  }

  static extractTokenFromRequest(request: NextRequest): string | null {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Also check cookies
    const token = request.cookies.get('auth-token')?.value;
    return token || null;
  }

  static async authenticateRequest(request: NextRequest): Promise<JWTPayload | null> {
    const token = this.extractTokenFromRequest(request);
    if (!token) return null;

    return this.verifyToken(token);
  }

  static generateApiKey(): string {
    const prefix = 'rz_sk_';
    const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return prefix + randomBytes;
  }

  static async hashApiKey(apiKey: string): Promise<string> {
    return this.hashPassword(apiKey);
  }

  static generateRefreshToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

export class AuthError extends Error {
  constructor(message: string, public status: number = 401) {
    super(message);
    this.name = 'AuthError';
  }
}

// Rate limiting for auth endpoints
export class AuthRateLimit {
  private static attempts = new Map<string, { count: number; resetAt: number }>();

  static checkRateLimit(identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);

    if (!attempt || now > attempt.resetAt) {
      this.attempts.set(identifier, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (attempt.count >= maxAttempts) {
      return false;
    }

    attempt.count++;
    return true;
  }

  static resetRateLimit(identifier: string): void {
    this.attempts.delete(identifier);
  }
}