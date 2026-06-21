import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Optimistic auth gate only: if a protected route is hit with no session cookie
// at all, bounce to /login. The real authentication + role check happens in the
// pages/server actions via lib/session.ts (see the Next.js auth guide — proxy is
// a pre-filter, not the source of truth).
export function proxy(request: NextRequest) {
  const hasSession =
    request.cookies.has('authjs.session-token') ||
    request.cookies.has('__Secure-authjs.session-token')

  if (!hasSession) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/tutor',
    '/tutor/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/partner',
    '/partner/:path*',
    '/account',
    '/account/:path*',
  ],
}
