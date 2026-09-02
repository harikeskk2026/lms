import { NextResponse } from 'next/server'

// Auth now lives in localStorage (see @/utilities/tokenStorage), which the Edge
// runtime this middleware executes in cannot read - there is no cookie to check
// here anymore. Route protection and role-based redirects are handled client-side
// instead: see (admin)/layout.jsx, (student)/layout.jsx, and the login page.
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)']
}
