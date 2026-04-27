'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

type MenuItem = {
  id: string
  name: string
  category: string
  description: string | null
  imageUrl: string | null
  ingredients: string | null
  steps: string | null
  notes: string | null
  available: boolean
}

type OrderItem = {
  id: string
  quantity: number
  menuItem: MenuItem
}

type Order = {
  id: string
  tableNumber: string
  category: string
  status: string
  createdAt: string
  items: OrderItem[]
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Offen',
  in_progress: 'In Arbeit',
  done: 'Fertig',
}

const STATUS_NEXT: Record<string, string> = {
  pending: 'in_progress',
  in_progress: 'done',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  done: 'bg-green-500/20 text-green-400 border-green-500/30',
}

function parseJson(val: string | null): string[] {
  if (!val) return []
  try { return JSON.parse(val) } catch { return [] }
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  return `${Math.floor(diff / 3600)}h`
}

export default function Home() {
  const [tab, setTab] = useState<'bar' | 'kitchen'>('bar')
  const [items, setItems] = useState<MenuItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [showOrders, setShowOrders] = useState(false)
  const [tableNumber, setTableNumber] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    const res = await fetch(`/api/menu-items?category=${tab}`)
    if (res.ok) setItems(await res.json())
  }, [tab])

  const fetchOrders = useCallback(async () => {
    const res = await fetch(`/api/orders?category=${tab}&active=true`)
    if (res.ok) {
      const fresh: Order[] = await res.json()
      setOrders(prev => {
        if (fresh.length > prev.length) {
          setNotification('Neue Bestellung eingetroffen!')
          setTimeout(() => setNotification(null), 3000)
        }
        return fresh
      })
    }
  }, [tab])

  useEffect(() => {
    fetchItems()
    fetchOrders()
  }, [fetchItems, fetchOrders])

  useEffect(() => {
    const interval = setInterval(fetchOrders, 3000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  async function createOrder() {
    if (!selectedItem || !tableNumber.trim()) return
    setSubmitting(true)
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableNumber: tableNumber.trim(),
        category: tab,
        items: [{ menuItemId: selectedItem.id, quantity }],
      }),
    })
    setSubmitting(false)
    setSelectedItem(null)
    setTableNumber('')
    setQuantity(1)
    fetchOrders()
  }

  async function updateStatus(orderId: string, status: string) {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (status === 'done') {
      setOrders(prev => prev.filter(o => o.id !== orderId))
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    }
  }

  const isBar = tab === 'bar'
  const accent = isBar ? '#d4a017' : '#22c55e'
  const accentBg = isBar ? 'bg-yellow-500' : 'bg-green-500'
  const accentBorder = isBar ? 'border-yellow-500/40' : 'border-green-500/40'
  const activeOrders = orders.filter(o => o.status !== 'done')

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d0d0d', color: '#f0f0f0' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#2a2a2a', background: '#111' }}>
        <span className="text-2xl font-bold tracking-tight" style={{ color: accent }}>KARASAN</span>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: '#2a2a2a' }}>
          <button
            onClick={() => setTab('bar')}
            className="px-6 py-2.5 text-sm font-semibold transition-all"
            style={{ background: tab === 'bar' ? '#d4a017' : '#1a1a1a', color: tab === 'bar' ? '#000' : '#9ca3af' }}
          >
            🍸 Bar
          </button>
          <button
            onClick={() => setTab('kitchen')}
            className="px-6 py-2.5 text-sm font-semibold transition-all"
            style={{ background: tab === 'kitchen' ? '#22c55e' : '#1a1a1a', color: tab === 'kitchen' ? '#000' : '#9ca3af' }}
          >
            🌿 Küche
          </button>
        </div>

        {/* Orders button */}
        <button
          onClick={() => setShowOrders(!showOrders)}
          className="relative flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all"
          style={{ borderColor: '#2a2a2a', background: '#1a1a1a', color: '#f0f0f0' }}
        >
          📋 Bestellungen
          {activeOrders.length > 0 && (
            <span className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-black ${accentBg}`}>
              {activeOrders.length}
            </span>
          )}
        </button>
      </header>

      {/* Toast notification */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl text-sm font-semibold shadow-2xl"
          style={{ background: accent, color: '#000' }}>
          🔔 {notification}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Item Grid */}
        <main className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4" style={{ color: '#6b7280' }}>
              <span className="text-5xl">{isBar ? '🍸' : '🌿'}</span>
              <p className="text-lg">Noch keine Artikel angelegt.</p>
              <a href="/admin" className="text-sm underline" style={{ color: accent }}>Im Admin-Panel hinzufügen →</a>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setSelectedItem(item); setQuantity(1) }}
                  className="rounded-2xl border overflow-hidden text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }}
                >
                  <div className="relative w-full h-36" style={{ background: '#0d0d0d' }}>
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        {isBar ? '🍸' : '🌿'}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm leading-tight">{item.name}</p>
                    {item.description && (
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: '#6b7280' }}>{item.description}</p>
                    )}
                    {parseJson(item.ingredients).length > 0 && (
                      <p className="mt-2 text-xs font-medium" style={{ color: accent }}>
                        {parseJson(item.ingredients).length} Zutaten
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>

        {/* Orders Sidebar */}
        {showOrders && (
          <aside className="w-80 border-l overflow-y-auto flex flex-col" style={{ borderColor: '#2a2a2a', background: '#111' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#2a2a2a' }}>
              <span className="font-semibold text-sm">Aktive Bestellungen</span>
              <button onClick={() => setShowOrders(false)} style={{ color: '#6b7280' }}>✕</button>
            </div>
            <div className="flex-1 p-3 space-y-3">
              {activeOrders.length === 0 ? (
                <p className="text-center text-sm mt-8" style={{ color: '#6b7280' }}>Keine aktiven Bestellungen</p>
              ) : (
                activeOrders.map(order => (
                  <div key={order.id} className={`rounded-xl border p-3 ${accentBorder}`} style={{ background: '#1a1a1a' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm" style={{ color: accent }}>Tisch {order.tableNumber}</span>
                      <span className="text-xs" style={{ color: '#6b7280' }}>{timeAgo(order.createdAt)}</span>
                    </div>
                    <ul className="text-sm space-y-1 mb-3">
                      {order.items.map(oi => (
                        <li key={oi.id} className="flex justify-between">
                          <span>{oi.menuItem.name}</span>
                          <span className="font-semibold" style={{ color: accent }}>×{oi.quantity}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                      {STATUS_NEXT[order.status] && (
                        <button
                          onClick={() => updateStatus(order.id, STATUS_NEXT[order.status])}
                          className="flex-1 text-xs py-1.5 rounded-lg font-semibold transition-all"
                          style={{ background: accent, color: '#000' }}
                        >
                          {STATUS_NEXT[order.status] === 'in_progress' ? '▶ Annehmen' : '✓ Fertig'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Item Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedItem(null) }}
        >
          <div
            className="w-full sm:w-[520px] max-h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
            style={{ background: '#161616', border: '1px solid #2a2a2a' }}
          >
            {/* Image */}
            <div className="relative w-full h-52 flex-shrink-0" style={{ background: '#0d0d0d' }}>
              {selectedItem.imageUrl ? (
                <Image src={selectedItem.imageUrl} alt={selectedItem.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-7xl">
                  {isBar ? '🍸' : '🌿'}
                </div>
              )}
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm"
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
              >✕</button>
              <div className="absolute bottom-3 left-4">
                <span className="px-3 py-1 rounded-full text-xs font-semibold text-black" style={{ background: accent }}>
                  {isBar ? '🍸 Bar' : '🌿 Küche'}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              <h2 className="text-xl font-bold">{selectedItem.name}</h2>
              {selectedItem.description && (
                <p className="text-sm" style={{ color: '#9ca3af' }}>{selectedItem.description}</p>
              )}

              {parseJson(selectedItem.ingredients).length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: accent }}>Zutaten</h3>
                  <ul className="space-y-1.5">
                    {parseJson(selectedItem.ingredients).map((ing, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} />
                        {ing}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {parseJson(selectedItem.steps).length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: accent }}>Zubereitung</h3>
                  <ol className="space-y-2">
                    {parseJson(selectedItem.steps).map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span
                          className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-black"
                          style={{ background: accent }}
                        >{i + 1}</span>
                        <span className="pt-0.5 leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {selectedItem.notes && (
                <div className="rounded-xl p-3 text-sm" style={{ background: '#1a1a1a', color: '#9ca3af' }}>
                  💡 {selectedItem.notes}
                </div>
              )}
            </div>

            {/* Order form */}
            <div className="p-4 border-t space-y-3" style={{ borderColor: '#2a2a2a' }}>
              <p className="text-sm font-semibold">Bestellung aufnehmen</p>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Tischnummer"
                  value={tableNumber}
                  onChange={e => setTableNumber(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createOrder()}
                  className="flex-1 px-3 py-2 rounded-xl text-sm outline-none border"
                  style={{ background: '#0d0d0d', borderColor: '#2a2a2a', color: '#f0f0f0' }}
                />
                <div className="flex items-center gap-2 rounded-xl border px-3" style={{ background: '#0d0d0d', borderColor: '#2a2a2a' }}>
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="text-lg font-bold" style={{ color: accent }}>−</button>
                  <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
                  <button onClick={() => setQuantity(q => q + 1)} className="text-lg font-bold" style={{ color: accent }}>+</button>
                </div>
              </div>
              <button
                onClick={createOrder}
                disabled={!tableNumber.trim() || submitting}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
                style={{ background: tableNumber.trim() ? accent : '#2a2a2a', color: tableNumber.trim() ? '#000' : '#6b7280' }}
              >
                {submitting ? 'Wird gespeichert…' : '✓ Bestellung aufnehmen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin link */}
      <div className="fixed bottom-4 right-4">
        <a
          href="/admin"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs border"
          style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#6b7280' }}
        >
          ⚙ Admin
        </a>
      </div>
    </div>
  )
}
