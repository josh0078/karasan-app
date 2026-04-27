'use client'

import { useState, useEffect, useRef } from 'react'
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
  sortOrder: number
}

type OrderItem = { id: string; quantity: number; menuItem: { name: string } }
type Order = {
  id: string
  tableNumber: string
  category: string
  status: string
  createdAt: string
  items: OrderItem[]
}

const EMPTY_FORM = {
  name: '', category: 'bar', description: '', imageUrl: '',
  ingredients: '', steps: '', notes: '', available: true, sortOrder: 0,
}

function parseJson(val: string | null): string[] {
  if (!val) return []
  try { return JSON.parse(val) } catch { return [] }
}

const STATUS_LABELS: Record<string, string> = { pending: 'Offen', in_progress: 'In Arbeit', done: 'Fertig' }
const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b', in_progress: '#3b82f6', done: '#22c55e',
}

export default function AdminPage() {
  const [view, setView] = useState<'items' | 'orders'>('items')
  const [items, setItems] = useState<MenuItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [filterCat, setFilterCat] = useState<'all' | 'bar' | 'kitchen'>('all')
  const [orderFilter, setOrderFilter] = useState<'active' | 'all'>('active')
  const fileRef = useRef<HTMLInputElement>(null)

  async function loadItems() {
    const res = await fetch('/api/menu-items?includeUnavailable=true')
    if (res.ok) setItems(await res.json())
  }

  async function loadOrders() {
    const param = orderFilter === 'active' ? '&active=true' : ''
    const res = await fetch(`/api/orders?${param}`)
    if (res.ok) setOrders(await res.json())
  }

  useEffect(() => { loadItems() }, [])
  useEffect(() => { if (view === 'orders') loadOrders() }, [view, orderFilter])

  function openNew() {
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(item: MenuItem) {
    setEditingItem(item)
    setForm({
      name: item.name,
      category: item.category,
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      ingredients: parseJson(item.ingredients).join('\n'),
      steps: parseJson(item.steps).join('\n'),
      notes: item.notes || '',
      available: item.available,
      sortOrder: item.sortOrder,
    })
    setShowForm(true)
  }

  async function uploadImage(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (res.ok) {
      const { url } = await res.json()
      setForm(f => ({ ...f, imageUrl: url }))
    }
    setUploading(false)
  }

  async function saveItem() {
    setSaving(true)
    const payload = {
      ...form,
      ingredients: form.ingredients.split('\n').map(s => s.trim()).filter(Boolean),
      steps: form.steps.split('\n').map(s => s.trim()).filter(Boolean),
    }
    if (editingItem) {
      await fetch(`/api/menu-items/${editingItem.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/menu-items', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
    }
    setSaving(false)
    setShowForm(false)
    loadItems()
  }

  async function deleteItem(id: string) {
    if (!confirm('Artikel wirklich löschen?')) return
    await fetch(`/api/menu-items/${id}`, { method: 'DELETE' })
    loadItems()
  }

  async function toggleAvailable(item: MenuItem) {
    await fetch(`/api/menu-items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, ingredients: parseJson(item.ingredients), steps: parseJson(item.steps), available: !item.available }),
    })
    loadItems()
  }

  async function updateOrderStatus(orderId: string, status: string) {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
    loadOrders()
  }

  async function deleteOrder(orderId: string) {
    await fetch(`/api/orders/${orderId}`, { method: 'DELETE' })
    loadOrders()
  }

  const filteredItems = filterCat === 'all' ? items : items.filter(i => i.category === filterCat)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d0d0d', color: '#f0f0f0' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#2a2a2a', background: '#111' }}>
        <div className="flex items-center gap-3">
          <a href="/" className="text-sm" style={{ color: '#6b7280' }}>← Display</a>
          <span className="text-xl font-bold" style={{ color: '#d4a017' }}>KARASAN</span>
          <span className="text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: '#2a2a2a', color: '#6b7280' }}>Admin</span>
        </div>
        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: '#2a2a2a' }}>
          {(['items', 'orders'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="px-5 py-2 text-sm font-medium transition-all"
              style={{ background: view === v ? '#d4a017' : '#1a1a1a', color: view === v ? '#000' : '#9ca3af' }}>
              {v === 'items' ? '🍽 Artikel' : '📋 Bestellungen'}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 p-6 max-w-6xl mx-auto w-full">

        {/* ── ITEMS VIEW ── */}
        {view === 'items' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {(['all', 'bar', 'kitchen'] as const).map(cat => (
                  <button key={cat} onClick={() => setFilterCat(cat)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                    style={{
                      background: filterCat === cat ? (cat === 'bar' ? '#d4a017' : cat === 'kitchen' ? '#22c55e' : '#f0f0f0') : '#1a1a1a',
                      color: filterCat === cat ? '#000' : '#9ca3af',
                      borderColor: filterCat === cat ? 'transparent' : '#2a2a2a',
                    }}>
                    {cat === 'all' ? 'Alle' : cat === 'bar' ? '🍸 Bar' : '🌿 Küche'}
                  </button>
                ))}
              </div>
              <button onClick={openNew}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ background: '#d4a017', color: '#000' }}>
                + Neuer Artikel
              </button>
            </div>

            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#2a2a2a' }}>
              {filteredItems.length === 0 ? (
                <div className="text-center py-16" style={{ color: '#6b7280' }}>
                  Noch keine Artikel. Klicke auf &quot;Neuer Artikel&quot;.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a' }}>
                      {['Bild', 'Name', 'Kategorie', 'Zutaten', 'Status', 'Aktionen'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, idx) => (
                      <tr key={item.id} style={{ borderBottom: idx < filteredItems.length - 1 ? '1px solid #1e1e1e' : undefined }}>
                        <td className="px-4 py-3">
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden" style={{ background: '#0d0d0d' }}>
                            {item.imageUrl
                              ? <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-xl">{item.category === 'bar' ? '🍸' : '🌿'}</div>
                            }
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{item.name}</p>
                          {item.description && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: '#6b7280' }}>{item.description}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: item.category === 'bar' ? '#d4a01720' : '#22c55e20', color: item.category === 'bar' ? '#d4a017' : '#22c55e' }}>
                            {item.category === 'bar' ? '🍸 Bar' : '🌿 Küche'}
                          </span>
                        </td>
                        <td className="px-4 py-3" style={{ color: '#6b7280' }}>
                          {parseJson(item.ingredients).length} Zutaten · {parseJson(item.steps).length} Schritte
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleAvailable(item)}
                            className="px-2 py-0.5 rounded-full text-xs font-medium border"
                            style={{
                              background: item.available ? '#22c55e20' : '#ef444420',
                              color: item.available ? '#22c55e' : '#ef4444',
                              borderColor: item.available ? '#22c55e40' : '#ef444440',
                            }}>
                            {item.available ? '✓ Aktiv' : '✕ Inaktiv'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(item)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:border-white/20"
                              style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }}>
                              ✏ Bearbeiten
                            </button>
                            <button onClick={() => deleteItem(item.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                              style={{ background: '#ef444420', color: '#ef4444' }}>
                              🗑 Löschen
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── ORDERS VIEW ── */}
        {view === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {(['active', 'all'] as const).map(f => (
                  <button key={f} onClick={() => setOrderFilter(f)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                    style={{ background: orderFilter === f ? '#d4a017' : '#1a1a1a', color: orderFilter === f ? '#000' : '#9ca3af', borderColor: orderFilter === f ? 'transparent' : '#2a2a2a' }}>
                    {f === 'active' ? 'Aktiv' : 'Alle'}
                  </button>
                ))}
              </div>
              <button onClick={loadOrders} className="px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: '#2a2a2a', color: '#9ca3af', background: '#1a1a1a' }}>
                ↻ Aktualisieren
              </button>
            </div>
            {orders.length === 0 ? (
              <div className="text-center py-16" style={{ color: '#6b7280' }}>Keine Bestellungen gefunden.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.map(order => (
                  <div key={order.id} className="rounded-2xl border p-4" style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-bold" style={{ color: order.category === 'bar' ? '#d4a017' : '#22c55e' }}>
                          Tisch {order.tableNumber}
                        </span>
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full" style={{ background: order.category === 'bar' ? '#d4a01720' : '#22c55e20', color: order.category === 'bar' ? '#d4a017' : '#22c55e' }}>
                          {order.category === 'bar' ? 'Bar' : 'Küche'}
                        </span>
                      </div>
                      <span className="text-xs" style={{ color: '#6b7280' }}>{new Date(order.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <ul className="space-y-1 mb-3 text-sm">
                      {order.items.map(oi => (
                        <li key={oi.id} className="flex justify-between">
                          <span>{oi.menuItem.name}</span>
                          <span style={{ color: '#6b7280' }}>×{oi.quantity}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: STATUS_COLORS[order.status] + '25', color: STATUS_COLORS[order.status] }}>
                        {STATUS_LABELS[order.status]}
                      </span>
                      {order.status !== 'done' && (
                        <button onClick={() => updateOrderStatus(order.id, order.status === 'pending' ? 'in_progress' : 'done')}
                          className="flex-1 text-xs py-1.5 rounded-lg font-semibold"
                          style={{ background: '#d4a017', color: '#000' }}>
                          {order.status === 'pending' ? '▶ Annehmen' : '✓ Fertig'}
                        </button>
                      )}
                      <button onClick={() => deleteOrder(order.id)} className="text-xs px-2 py-1.5 rounded-lg" style={{ background: '#ef444420', color: '#ef4444' }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── ITEM FORM MODAL ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl" style={{ background: '#161616', border: '1px solid #2a2a2a' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#2a2a2a' }}>
              <h2 className="font-bold text-lg">{editingItem ? 'Artikel bearbeiten' : 'Neuer Artikel'}</h2>
              <button onClick={() => setShowForm(false)} style={{ color: '#6b7280' }}>✕</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Image */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: '#6b7280' }}>Bild</label>
                <div className="flex gap-3 items-start">
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0" style={{ background: '#0d0d0d' }}>
                    {form.imageUrl
                      ? <Image src={form.imageUrl} alt="preview" fill className="object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl">{form.category === 'bar' ? '🍸' : '🌿'}</div>
                    }
                  </div>
                  <div className="flex-1 space-y-2">
                    <input ref={fileRef} type="file" accept="image/*" className="hidden"
                      onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="w-full py-2 rounded-xl text-sm border transition-all"
                      style={{ borderColor: '#2a2a2a', background: '#1a1a1a', color: '#f0f0f0' }}>
                      {uploading ? '⏳ Wird hochgeladen…' : '📁 Bild hochladen'}
                    </button>
                    <input type="text" placeholder="oder URL eingeben"
                      value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                      style={{ background: '#0d0d0d', borderColor: '#2a2a2a', color: '#f0f0f0' }} />
                  </div>
                </div>
              </div>

              {/* Name + Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#6b7280' }}>Name *</label>
                  <input type="text" placeholder="z.B. Martini" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                    style={{ background: '#0d0d0d', borderColor: '#2a2a2a', color: '#f0f0f0' }} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#6b7280' }}>Kategorie *</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                    style={{ background: '#0d0d0d', borderColor: '#2a2a2a', color: '#f0f0f0' }}>
                    <option value="bar">🍸 Bar</option>
                    <option value="kitchen">🌿 Küche</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#6b7280' }}>Beschreibung</label>
                <input type="text" placeholder="Kurze Beschreibung" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                  style={{ background: '#0d0d0d', borderColor: '#2a2a2a', color: '#f0f0f0' }} />
              </div>

              {/* Ingredients */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#6b7280' }}>
                  Zutaten <span style={{ color: '#4b5563' }}>(eine pro Zeile)</span>
                </label>
                <textarea rows={4} placeholder={'2cl Gin\n1cl Vermouth\nOlive'}
                  value={form.ingredients} onChange={e => setForm(f => ({ ...f, ingredients: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none resize-none"
                  style={{ background: '#0d0d0d', borderColor: '#2a2a2a', color: '#f0f0f0' }} />
              </div>

              {/* Steps */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#6b7280' }}>
                  Zubereitungsschritte <span style={{ color: '#4b5563' }}>(einer pro Zeile)</span>
                </label>
                <textarea rows={4} placeholder={'Glas mit Eis kühlen\nZutaten in Shaker geben\n30 Sekunden schütteln'}
                  value={form.steps} onChange={e => setForm(f => ({ ...f, steps: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none resize-none"
                  style={{ background: '#0d0d0d', borderColor: '#2a2a2a', color: '#f0f0f0' }} />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#6b7280' }}>Notizen</label>
                <input type="text" placeholder="z.B. Bitte kalt servieren" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                  style={{ background: '#0d0d0d', borderColor: '#2a2a2a', color: '#f0f0f0' }} />
              </div>

              {/* Available + Save */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.available} onChange={e => setForm(f => ({ ...f, available: e.target.checked }))}
                    className="w-4 h-4 rounded" />
                  Artikel aktiv (im Display sichtbar)
                </label>
                <div className="flex gap-3">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm border"
                    style={{ borderColor: '#2a2a2a', color: '#9ca3af', background: '#1a1a1a' }}>
                    Abbrechen
                  </button>
                  <button onClick={saveItem} disabled={!form.name.trim() || saving}
                    className="px-6 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
                    style={{ background: '#d4a017', color: '#000' }}>
                    {saving ? 'Speichert…' : '✓ Speichern'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
