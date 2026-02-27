import { NextRequest, NextResponse } from 'next/server';

/**
 * Alpha staging gate.
 * When ALPHA_PASSWORD is set, all pages require a password cookie.
 * API routes and static assets are exempt.
 * Disabled entirely when ALPHA_PASSWORD is not set (local dev).
 */
export function middleware(request: NextRequest) {
  const password = process.env.ALPHA_PASSWORD;

  // No password set → gate disabled (local dev)
  if (!password) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Skip: API routes, static files, auth callbacks, the gate page itself
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/auth/') ||
    pathname === '/alpha-gate' ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Check for valid gate cookie
  const gateCookie = request.cookies.get('alpha_gate')?.value;
  if (gateCookie === password) {
    return NextResponse.next();
  }

  // Redirect to gate page
  const gateUrl = new URL('/alpha-gate', request.url);
  gateUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(gateUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
