import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/auth') || pathname.startsWith('/login')) {
    return NextResponse.next()
  }

  // API routes: return 401 instead of redirect
  if (pathname.startsWith('/api/')) {
    const auth = request.cookies.get('karasan-auth')
    if (!auth || auth.value !== process.env.AUTH_SECRET) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    }
    return NextResponse.next()
  }

  const auth = request.cookies.get('karasan-auth')
  if (!auth || auth.value !== process.env.AUTH_SECRET) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads).*)'],
}
