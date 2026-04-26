import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Lucia's default session cookie name
const SESSION_COOKIE_NAME = 'auth_session'

// Routes that require a valid session
const PROTECTED_ROUTES = ['/mail']

// Routes that logged-in users should NOT be able to visit
const AUTH_ROUTES = ['/sign-in', '/sign-up']

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const isAuthenticated = !!sessionCookie

  // If visiting a protected route without session → redirect to sign-in
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      const signInUrl = new URL('/sign-in', request.url)
      return NextResponse.redirect(signInUrl)
    }
  }

  // If already logged in and visiting auth routes → redirect to mail
  if (AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    if (isAuthenticated) {
      const mailUrl = new URL('/mail', request.url)
      return NextResponse.redirect(mailUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}