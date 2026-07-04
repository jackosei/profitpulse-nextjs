import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  authRoutes,
  publicRoutes,
  JOURNAL_ROUTE,
  APP_HOME,
  utcDayKey,
} from '@/config/routes'

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value
  const path = request.nextUrl.pathname

  const isAuthRoute = authRoutes.includes(path)
  const isPublicRoute = publicRoutes.includes(path)

  // Public marketing pages are reachable by anyone.
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Signed-in users have no business on the auth screens.
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL(APP_HOME, request.url))
  }

  // Signed-out users can only reach auth (+ public, handled above).
  if (!session) {
    if (isAuthRoute) return NextResponse.next()
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Signed in: enforce the once-per-day journal gate before any app route.
  // The cookie holds the UTC day it was completed; a new day fails the
  // equality check and re-gates the user.
  const journaledToday =
    request.cookies.get('journaled')?.value === utcDayKey()

  if (!journaledToday && path !== JOURNAL_ROUTE) {
    return NextResponse.redirect(new URL(JOURNAL_ROUTE, request.url))
  }

  // Already journaled — don't keep them on the gate.
  if (journaledToday && path === JOURNAL_ROUTE) {
    return NextResponse.redirect(new URL(APP_HOME, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes — the session/journal routes must stay reachable)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - *.svg / *.png / *.jpg / *.jpeg / *.gif (static assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$).*)',
  ],
}
