import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Only apply basic auth to admin routes and sensitive APIs
  if (
    req.nextUrl.pathname.startsWith('/goatech-admin-hq') ||
    req.nextUrl.pathname.startsWith('/api/goatech-admin-hq') ||
    req.nextUrl.pathname.startsWith('/api/seed-themes')
  ) {
    const basicAuth = req.headers.get('authorization');
    
    // Check for Basic Auth
    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1];
      // Decode base64
      const [user, pwd] = atob(authValue).split(':');

      // Super simple hardcoded admin credentials for now
      // In production, these should be environment variables
      const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
      const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin';

      if (user === ADMIN_USER && pwd === ADMIN_PASS) {
        return NextResponse.next();
      }
    }

    return new NextResponse('Auth Required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
      },
    });
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/goatech-admin-hq/:path*',
    '/api/goatech-admin-hq/:path*',
    '/api/seed-themes/:path*',
  ],
};
