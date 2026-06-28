import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ROUTE_ROLES: Record<string, string[]> = {
  '/scada':          ['SUPER_ADMIN', 'OWNER', 'TECHNICIAN'],
  '/farm':           ['SUPER_ADMIN', 'OWNER', 'TECHNICIAN'],
  '/animals':        ['SUPER_ADMIN', 'OWNER', 'BARN'],
  '/crm':            ['SUPER_ADMIN', 'OWNER'],
  '/finance':        ['SUPER_ADMIN', 'OWNER'],
  '/reports':        ['SUPER_ADMIN', 'OWNER'],
  '/settings/users': ['SUPER_ADMIN', 'OWNER'],
  '/settings':       ['SUPER_ADMIN', 'OWNER'],
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Login sayfası — token varsa dashboard'a yönlendir
  if (pathname === '/login') {
    const token = request.cookies.get('accessToken')?.value
    if (token) return NextResponse.redirect(new URL('/dashboard', request.url))
    return NextResponse.next()
  }

  // Auth gerektiren sayfalar
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/scada') ||
      pathname.startsWith('/tasks') || pathname.startsWith('/farm') ||
      pathname.startsWith('/animals') || pathname.startsWith('/crm') ||
      pathname.startsWith('/finance') || pathname.startsWith('/stock') ||
      pathname.startsWith('/settings')) {

    const token = request.cookies.get('accessToken')?.value
    if (!token) return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}