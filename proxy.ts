import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // API routes are open (called by both staff display and admin)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // /admin needs the admin cookie
  if (pathname.startsWith('/admin')) {
    const cookie = request.cookies.get('karasan-admin')
    if (!cookie || cookie.value !== (process.env.ADMIN_SECRET ?? 'karasan-admin-2026')) {
      const url = new URL('/login', request.url)
      url.searchParams.set('from', pathname)
      url.searchParams.set('type', 'admin')
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // All other pages need the staff cookie
  const cookie = request.cookies.get('karasan-auth')
  if (!cookie || cookie.value !== (process.env.AUTH_SECRET ?? 'karasan-staff')) {
    const url = new URL('/login', request.url)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads).*)'],
}
