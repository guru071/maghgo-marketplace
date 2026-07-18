import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Only apply basic auth to admin routes and sensitive APIs
  if (
    req.nextUrl.pathname.startsWith('/goatech-admin-hq') ||
    req.nextUrl.pathname.startsWith('/api/goatech-admin-hq')
  ) {
    const basicAuth = req.headers.get('authorization');
    
    // Check for Basic Auth
    if (basicAuth) {
      try {
        const authValue = basicAuth.split(' ')[1];
        if (!authValue) throw new Error('Missing auth value');
        
        // Decode base64
        const [user, pwd] = atob(authValue).split(':');

        // Credentials must be provided via environment variables. Fail secure if missing.
      const ADMIN_USER = process.env.ADMIN_USERNAME;
      const ADMIN_PASS = process.env.ADMIN_PASSWORD;

      if (!ADMIN_USER || !ADMIN_PASS) {
        return new NextResponse('Admin credentials not configured on the server', { status: 403 });
      }

      if (user === ADMIN_USER && pwd === ADMIN_PASS) {
        return NextResponse.next();
      }
      } catch (err) {
        // Fall through to 401 response if decoding fails
        console.warn('Malformed authorization header');
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
  ],
};
