import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { publicRoutes, authRoutes } from '@/config/routes'
// import { cookies } from 'next/headers'
// import { auth as adminAuth } from '@/firebase/admin'

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value
  const path = request.nextUrl.pathname

  // Allow public routes
  if (publicRoutes.includes(path)) {
    return NextResponse.next()
  }

  // If user is logged in and tries to access auth pages (login/signup), redirect to home
  if (session && authRoutes.includes(path)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If user is not logged in and tries to access protected routes, redirect to login
  if (!session && !authRoutes.includes(path)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - *.svg (SVG files)
     * - *.png (PNG files)
     * - *.jpg (JPEG files)
     * - *.jpeg (JPEG files)
     * - *.gif (GIF files)
     * - other static files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$).*)',
  ],
} 