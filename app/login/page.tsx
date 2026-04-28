'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/'
  const type = searchParams.get('type') || 'staff'
  const isAdmin = type === 'admin'

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, type }),
      })
      const data = await res.json()
      if (data.ok) {
        router.push(from)
        router.refresh()
      } else {
        setError(data.error || 'Falsches Passwort')
      }
    } catch {
      setError('Verbindungsfehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-wide">KARASAN</h1>
          <p className="mt-2 text-sm font-medium px-3 py-1 rounded-full inline-block"
            style={{ background: isAdmin ? '#78350f' : '#1c3a2a', color: '#fcd34d' }}>
            {isAdmin ? 'Admin-Zugang' : 'Mitarbeiter-Zugang'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-6 shadow-xl border border-gray-800 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              required
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:outline-none focus:border-amber-500 transition text-center text-xl tracking-widest"
              placeholder="****"
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold rounded-lg py-3 transition disabled:opacity-50 text-white"
            style={{ background: '#d97706' }}
          >
            {loading ? 'Prüfe...' : 'Weiter'}
          </button>

          {isAdmin && (
            <a href="/" className="block text-center text-xs text-gray-500 hover:text-gray-400 transition">
              Zurück zum Display
            </a>
          )}
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
