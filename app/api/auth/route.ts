import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { password, type } = await request.json()

  if (type === 'admin') {
    const validPass = process.env.ADMIN_PASSWORD ?? '2026'
    if (password !== validPass) {
      return NextResponse.json({ ok: false, error: 'Falsches Admin-Passwort' }, { status: 401 })
    }
    const response = NextResponse.json({ ok: true })
    response.cookies.set('karasan-admin', process.env.ADMIN_SECRET ?? 'karasan-admin-2026', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    })
    return response
  }

  // Staff login
  const validPass = process.env.AUTH_PASSWORD ?? 'karasan'
  if (password !== validPass) {
    return NextResponse.json({ ok: false, error: 'Falsches Passwort' }, { status: 401 })
  }
  const response = NextResponse.json({ ok: true })
  response.cookies.set('karasan-auth', process.env.AUTH_SECRET ?? 'karasan-staff', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('karasan-auth')
  return response
}
