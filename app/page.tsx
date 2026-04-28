'use client'

import { useState, useEffect, useCallback } from 'react'

const BAR_SUBCATEGORIES = [
  { key: 'bier', label: 'Bier' },
  { key: 'wein', label: 'Wein' },
  { key: 'shots', label: 'Shots' },
  { key: 'cocktails', label: 'Cocktails' },
  { key: 'softgetraenke', label: 'Softgetränke' },
  { key: 'energy', label: 'Energy' },
  { key: 'heissgetraenke', label: 'Heißgetränke' },
]

type MenuItem = {
  id: string
  name: string
  category: string
  subcategory: string
  description: string | null
  imageUrl: string | null
  ingredients: string | null
  steps: string | null
  notes: string | null
  price: number
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

type TableGroup = {
  tableNumber: string
  orders: Order[]
  status: string
  createdAt: string
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

function groupByTable(orders: Order[]): TableGroup[] {
  const map = new Map<string, Order[]>()
  for (const o of orders) {
    const existing = map.get(o.tableNumber) ?? []
    map.set(o.tableNumber, [...existing, o])
  }
  return Array.from(map.entries()).map(([tableNumber, tableOrders]) => ({
    tableNumber,
    orders: tableOrders,
    status: tableOrders.some(o => o.status === 'in_progress') ? 'in_progress'
          : tableOrders.every(o => o.status === 'done') ? 'done' : 'pending',
    createdAt: tableOrders[0].createdAt,
  }))
}

export default function Home() {
  const [tab, setTab] = useState<'bar' | 'kitchen'>('bar')
  const [subcatFilter, setSubcatFilter] = useState('')
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
    setSubcatFilter('')
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

  async function updateGroupStatus(group: TableGroup, nextStatus: string) {
    const ordersToUpdate = group.orders.filter(o => o.status !== 'done')
    await Promise.all(
      ordersToUpdate.map(o =>
        fetch(`/api/orders/${o.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        })
      )
    )
    fetchOrders()
  }

  const isBar = tab === 'bar'
  const accent = isBar ? '#d97706' : '#16a34a'
  const accentLight = isBar ? '#fef3c7' : '#dcfce7'
  const activeOrders = orders.filter(o => o.status !== 'done')
  const tableGroups = groupByTable(activeOrders)
  const filteredItems = (subcatFilter && isBar)
    ? items.filter(i => i.subcategory === subcatFilter)
    : items

  const statusStyle: Record<string, { bg: string; color: string }> = {
    pending:     { bg: '#fef9c3', color: '#854d0e' },
    in_progress: { bg: '#dbeafe', color: '#1e40af' },
    done:        { bg: '#dcfce7', color: '#15803d' },
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
        <span className="text-xl font-bold tracking-tight" style={{ color: accent }}>KARASAN</span>

        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          <button
            onClick={() => setTab('bar')}
            className="px-6 py-2 text-sm font-semibold transition-all"
            style={{ background: tab === 'bar' ? '#d97706' : '#fff', color: tab === 'bar' ? '#fff' : '#6b7280' }}
          >
            🍸 Bar
          </button>
          <button
            onClick={() => setTab('kitchen')}
            className="px-6 py-2 text-sm font-semibold transition-all"
            style={{ background: tab === 'kitchen' ? '#16a34a' : '#fff', color: tab === 'kitchen' ? '#fff' : '#6b7280' }}
          >
            🌿 Küche
          </button>
        </div>

        <button
          onClick={() => setShowOrders(!showOrders)}
          className="relative flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
        >
          📋 Bestellungen
          {tableGroups.length > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: accent }}>
              {tableGroups.length}
            </span>
          )}
        </button>
      </header>

      {/* Toast */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl text-sm font-semibold shadow-lg text-white"
          style={{ background: accent }}>
          🔔 {notification}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Item Grid — always 2 columns */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {isBar && (
            <div className="px-4 pt-3 pb-1 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <button
                onClick={() => setSubcatFilter('')}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                style={subcatFilter === '' ? { background: '#d97706', color: '#fff', borderColor: '#d97706' }
                                           : { background: '#fff', color: '#6b7280', borderColor: '#e5e7eb' }}
              >Alle</button>
              {BAR_SUBCATEGORIES.map(s => (
                <button key={s.key}
                  onClick={() => setSubcatFilter(subcatFilter === s.key ? '' : s.key)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                  style={subcatFilter === s.key
                    ? { background: '#d97706', color: '#fff', borderColor: '#d97706' }
                    : { background: '#fff', color: '#6b7280', borderColor: '#e5e7eb' }}
                >{s.label}</button>
              ))}
            </div>
          )}
          <div className="flex-1 p-4">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
              <span className="text-5xl">{isBar ? '🍸' : '🌿'}</span>
              <p className="text-base">{subcatFilter ? 'Keine Artikel in dieser Kategorie.' : 'Noch keine Artikel angelegt.'}</p>
              {!subcatFilter && <a href="/admin" className="text-sm underline" style={{ color: accent }}>Im Admin-Panel hinzufügen →</a>}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setSelectedItem(item); setQuantity(1) }}
                  className="rounded-2xl border border-gray-200 bg-white overflow-hidden text-left shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="w-full h-36 flex items-center justify-center overflow-hidden bg-gray-100">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">{isBar ? '🍸' : '🌿'}</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm text-gray-900 leading-tight">{item.name}</p>
                    {item.description && (
                      <p className="text-xs mt-1 text-gray-500 line-clamp-1">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      {item.price > 0 ? (
                        <span className="text-sm font-bold" style={{ color: accent }}>
                          {item.price.toFixed(2)} €
                        </span>
                      ) : (
                        <span />
                      )}
                      {parseJson(item.ingredients).length > 0 && (
                        <span className="text-xs text-gray-400">
                          {parseJson(item.ingredients).length} Zutaten
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          </div>
        </main>

        {/* Orders Sidebar — grouped by table */}
        {showOrders && (
          <aside className="w-80 border-l border-gray-200 bg-white overflow-y-auto flex flex-col shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="font-semibold text-sm text-gray-800">Aktive Bestellungen</span>
              <button onClick={() => setShowOrders(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 p-3 space-y-3">
              {tableGroups.length === 0 ? (
                <p className="text-center text-sm mt-8 text-gray-400">Keine aktiven Bestellungen</p>
              ) : (
                tableGroups.map(group => {
                  const allItems = group.orders.flatMap(o => o.items)
                  const groupStatus = group.status
                  const nextStatus = STATUS_NEXT[groupStatus]
                  return (
                    <div key={group.tableNumber}
                      className="rounded-xl border bg-white p-3 shadow-sm"
                      style={{ borderLeftWidth: 3, borderLeftColor: accent, borderColor: accentLight }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm" style={{ color: accent }}>
                          Tisch {group.tableNumber}
                        </span>
                        <span className="text-xs text-gray-400">{timeAgo(group.createdAt)}</span>
                      </div>
                      <ul className="text-sm space-y-1 mb-3 text-gray-700">
                        {allItems.map(oi => (
                          <li key={oi.id} className="flex justify-between">
                            <span>{oi.menuItem.name}</span>
                            <span className="font-semibold" style={{ color: accent }}>×{oi.quantity}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: statusStyle[groupStatus]?.bg, color: statusStyle[groupStatus]?.color }}>
                          {STATUS_LABELS[groupStatus]}
                        </span>
                        {nextStatus && (
                          <button
                            onClick={() => updateGroupStatus(group, nextStatus)}
                            className="flex-1 text-xs py-1.5 rounded-lg font-semibold text-white transition-all"
                            style={{ background: accent }}
                          >
                            {nextStatus === 'in_progress' ? '▶ Annehmen' : '✓ Fertig'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Item Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedItem(null) }}
        >
          <div className="w-full sm:w-[520px] max-h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col bg-white shadow-2xl">
            {/* Image */}
            <div className="relative w-full h-52 flex-shrink-0 flex items-center justify-center overflow-hidden bg-gray-100">
              {selectedItem.imageUrl ? (
                <img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-7xl">{isBar ? '🍸' : '🌿'}</span>
              )}
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm bg-white/90 text-gray-700 shadow"
              >✕</button>
              <div className="absolute bottom-3 left-4 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ background: accent }}>
                  {isBar ? '🍸 Bar' : '🌿 Küche'}
                </span>
                {selectedItem.price > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-gray-800 shadow">
                    {selectedItem.price.toFixed(2)} €
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              <h2 className="text-xl font-bold text-gray-900">{selectedItem.name}</h2>
              {selectedItem.description && (
                <p className="text-sm text-gray-500">{selectedItem.description}</p>
              )}

              {parseJson(selectedItem.ingredients).length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: accent }}>Zutaten</h3>
                  <ul className="space-y-1.5">
                    {parseJson(selectedItem.ingredients).map((ing, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
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
                      <li key={i} className="flex gap-3 text-sm text-gray-700">
                        <span className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                          style={{ background: accent }}>{i + 1}</span>
                        <span className="pt-0.5 leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {selectedItem.notes && (
                <div className="rounded-xl p-3 text-sm text-gray-600 bg-amber-50 border border-amber-100">
                  💡 {selectedItem.notes}
                </div>
              )}
            </div>

            {/* Order form */}
            <div className="p-4 border-t border-gray-200 space-y-3 bg-gray-50">
              <p className="text-sm font-semibold text-gray-800">Bestellung aufnehmen</p>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Tischnummer"
                  value={tableNumber}
                  onChange={e => setTableNumber(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createOrder()}
                  className="flex-1 px-3 py-2 rounded-xl text-sm border border-gray-300 bg-white text-gray-900 outline-none focus:border-amber-400"
                />
                <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="text-lg font-bold" style={{ color: accent }}>−</button>
                  <span className="w-6 text-center text-sm font-semibold text-gray-800">{quantity}</span>
                  <button onClick={() => setQuantity(q => q + 1)} className="text-lg font-bold" style={{ color: accent }}>+</button>
                </div>
              </div>
              <button
                onClick={createOrder}
                disabled={!tableNumber.trim() || submitting}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40"
                style={{ background: tableNumber.trim() ? accent : '#9ca3af' }}
              >
                {submitting ? 'Wird gespeichert…' : '✓ Bestellung aufnehmen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin link */}
      <div className="fixed bottom-4 right-4">
        <a href="/admin" className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs border border-gray-200 bg-white text-gray-500 shadow-sm hover:shadow-md transition-all">
          ⚙ Admin
        </a>
      </div>
    </div>
  )
}
