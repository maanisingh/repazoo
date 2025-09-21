import { NextRequest, NextResponse } from 'next/server';

// Rate limiting storage (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function getRateLimitKey(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown';
  const pathname = request.nextUrl.pathname;
  return `${ip}:${pathname}`;
}

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (record.count >= limit) {
    return true;
  }

  record.count++;
  return false;
}

// Simple JWT verification for Edge Runtime
function verifyTokenSimple(token: string): boolean {
  try {
    // Just check if it's a valid JWT format and not expired
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Decode payload
    const payload = JSON.parse(atob(parts[1]));

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Domain-based routing
  if (hostname === 'cfy.repazoo.com') {
    // Marketing site - only allow marketing routes
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
      // Redirect dashboard/admin access from marketing domain to dashboard domain
      const dashboardUrl = new URL(pathname, 'https://dash.repazoo.com');
      return NextResponse.redirect(dashboardUrl);
    }
  } else if (hostname === 'dash.repazoo.com') {
    // Dashboard domain - redirect root to dashboard
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Apply CORS for API routes
  if (pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: response.headers });
    }
  }

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    const rateLimitKey = getRateLimitKey(request);

    // Different rate limits for different endpoints
    let limit = 100; // Default: 100 requests per 15 minutes
    let windowMs = 15 * 60 * 1000; // 15 minutes

    // Stricter limits for auth endpoints
    if (pathname.startsWith('/api/auth/')) {
      limit = 10; // 10 requests per 15 minutes
      windowMs = 15 * 60 * 1000;
    }

    // Stricter limits for admin endpoints
    if (pathname.startsWith('/api/admin/')) {
      limit = 50; // 50 requests per 15 minutes
      windowMs = 15 * 60 * 1000;
    }

    // More generous for reading data
    if (request.method === 'GET') {
      limit = limit * 2; // Double the limit for GET requests
    }

    if (isRateLimited(rateLimitKey, limit, windowMs)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: {
            ...response.headers,
            'Retry-After': '900', // 15 minutes
          }
        }
      );
    }
  }

  // Skip API authentication in middleware - handle in individual routes

  // Dashboard routes require authentication
  if (pathname.startsWith('/dashboard')) {
    const authToken = request.cookies.get('auth-token')?.value;

    console.log('Dashboard access attempt:', { pathname, hasToken: !!authToken });

    if (!authToken) {
      console.log('No auth token found, redirecting to login');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const isValidToken = verifyTokenSimple(authToken);
    console.log('Token verification result:', { isValid: isValidToken });

    if (!isValidToken) {
      console.log('Invalid token, redirecting to login');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // For admin panel access, we'll check in the actual page component
    // since we can't verify isAdmin in Edge Runtime without full JWT verification
  }

  // Auth routes redirect to dashboard if already logged in
  if (['/login', '/register'].includes(pathname)) {
    const authToken = request.cookies.get('auth-token')?.value;

    if (authToken && verifyTokenSimple(authToken)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};