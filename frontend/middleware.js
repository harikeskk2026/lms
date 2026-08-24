import { NextResponse } from 'next/server'

export function middleware(request) {
  const accessToken = request.cookies.get('clms_at')?.value
  const { pathname } = request.nextUrl

  const publicPaths = ['/login', '/forgot-password', '/reset-password', '/verify']
  const isPublic = publicPaths.some(p => pathname.startsWith(p))

  // Not logged in → redirect to login
  if (!accessToken && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Logged in → redirect away from auth pages
  if (accessToken && isPublic) {
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]))
      const dest = payload.role === 'STUDENT' ? '/student/dashboard' : '/admin/dashboard'
      return NextResponse.redirect(new URL(dest, request.url))
    } catch {
      // Token malformed — let it through to login
    }
  }

  // Role-based path protection: admin paths for non-STUDENT roles only
  if (accessToken && pathname.startsWith('/admin')) {
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]))
      if (payload.role === 'STUDENT') {
        return NextResponse.redirect(new URL('/student/dashboard', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Role-based path protection: student paths for STUDENT role only
  if (accessToken && pathname.startsWith('/student')) {
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]))
      if (['SUPERADMIN', 'ADMIN', 'TRAINER'].includes(payload.role)) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)']
}
