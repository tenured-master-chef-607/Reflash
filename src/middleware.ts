import { NextRequest, NextResponse } from 'next/server';

// Special paths that should not have the middleware applied
const EXEMPT_PATHS = [
  '/_next',
  '/favicon.ico',
];

/**
 * Simple middleware that doesn't interfere with cookie or header handling
 * We're using direct API calls to handle credentials now
 */
export function middleware(request: NextRequest) {
  // Skip middleware for exempt paths
  if (EXEMPT_PATHS.some(path => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Pass through without modifying the request or response
  return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes that handle their own auth
     * 2. /_next (internal Next.js paths)
     * 3. /_vercel (Vercel system paths)
     * 4. /favicon.ico, /sitemap.xml, /robots.txt (static files)
     */
    '/((?!_next|_vercel|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}; 