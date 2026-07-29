import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/', '/login'];

function isValidJwt(token: string): boolean {
  if (!token) return false;
  const parts = token.split('.');
  return parts.length === 3;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some(p => pathname === p)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;

  const protectedRoutes = ['/dashboard', '/employees', '/upload', '/payslips', '/attendance'];
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtected && !isValidJwt(token || '')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === '/login' && isValidJwt(token || '')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
