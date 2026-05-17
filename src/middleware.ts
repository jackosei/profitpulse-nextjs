import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authRoutes } from '@/config/routes'

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value
  const path = request.nextUrl.pathname
  const isAuthRoute = authRoutes.includes(path)

  // Logged-in users shouldn't see the auth pages
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Unauthenticated users can only reach the auth pages
  if (!session && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes — the session route must stay reachable while logged out)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - *.svg / *.png / *.jpg / *.jpeg / *.gif (static assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$).*)',
  ],
}
