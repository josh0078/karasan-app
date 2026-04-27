import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { username, password } = await request.json()

  const validUser = process.env.AUTH_USERNAME
  const validPass = process.env.AUTH_PASSWORD

  if (username === validUser && password === validPass) {
    const response = NextResponse.json({ ok: true })
    response.cookies.set('karasan-auth', process.env.AUTH_SECRET!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 Tage
      path: '/',
    })
    return response
  }

  return NextResponse.json({ ok: false, error: 'Falscher Benutzername oder Passwort' }, { status: 401 })
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('karasan-auth')
  return response
}
