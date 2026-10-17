import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, parseSessionCookie, getRoleHomeRoute } from './lib/auth';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = parseSessionCookie(cookie);

  // 1. Root path `/` (localhost:3000) is ALWAYS public landing page
  if (pathname === '/') {
    return NextResponse.next();
  }

  // 2. Already logged in visiting /login -> redirect to role home (/hod or /coordinator)
  if (pathname === '/login' && session) {
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    const target = redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
      ? redirectParam
      : getRoleHomeRoute(session.role);
    return NextResponse.redirect(new URL(target, request.url));
  }

  // 3. /faculty alias -> redirect to /coordinator
  if (pathname === '/faculty' || pathname.startsWith('/faculty/')) {
    const coordPath = pathname.replace(/^\/faculty/, '/coordinator');
    return NextResponse.redirect(new URL(coordPath, request.url));
  }

  // 4. Secure HOD dedicated routes (/hod and /hod/*)
  if (pathname === '/hod' || pathname.startsWith('/hod/')) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (session.role !== 'HOD') {
      const coordUrl = new URL('/coordinator', request.url);
      coordUrl.searchParams.set('restricted', 'hod_only');
      return NextResponse.redirect(coordUrl);
    }

    return NextResponse.next();
  }

  // 5. Secure Coordinator dedicated routes (/coordinator and /coordinator/*)
  if (pathname === '/coordinator' || pathname.startsWith('/coordinator/')) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // 6. Legacy routes redirection (/dashboard, /roles, /forms, /projects, /students)
  if (
    pathname === '/dashboard' ||
    pathname === '/roles' ||
    pathname.startsWith('/roles/') ||
    pathname === '/forms' ||
    pathname.startsWith('/forms/') ||
    pathname === '/projects' ||
    pathname.startsWith('/projects/') ||
    pathname === '/students' ||
    pathname.startsWith('/students/')
  ) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (session.role === 'HOD') {
      if (pathname === '/dashboard') {
        return NextResponse.redirect(new URL('/hod', request.url));
      }
      return NextResponse.redirect(new URL(`/hod${pathname}`, request.url));
    } else {
      // Coordinator
      if (pathname === '/dashboard') {
        return NextResponse.redirect(new URL('/coordinator', request.url));
      }
      if (pathname === '/roles' || pathname.startsWith('/roles/') || pathname.startsWith('/projects/new')) {
        const coordUrl = new URL('/coordinator', request.url);
        coordUrl.searchParams.set('restricted', 'hod_only');
        return NextResponse.redirect(coordUrl);
      }
      return NextResponse.redirect(new URL(`/coordinator${pathname}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images with .png, .jpg, .svg, .xlsx)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|xlsx)$).*)',
  ],
};
