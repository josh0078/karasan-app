'use client'

import { useState, useEffect, useRef } from 'react'

type MenuItem = {
  id: string
  name: string
  category: string
  description: string | null
  imageUrl: string | null
  ingredients: string | null
  steps: string | null
  notes: string | null
  price: number
  available: boolean
  sortOrder: number
}

type OrderItem = { id: string; quantity: number; menuItem: { name: string; price: number } }
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
  ingredients: '', steps: '', notes: '', price: 0, available: true, sortOrder: 0,
}

function parseJson(val: string | null): string[] {
  if (!val) return []
  try { return JSON.parse(val) } catch { return [] }
}

const STATUS_LABELS: Record<string, string> = { pending: 'Offen', in_progress: 'In Arbeit', done: 'Fertig' }
const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  pending:     { bg: '#fef9c3', color: '#854d0e' },
  in_progress: { bg: '#dbeafe', color: '#1e40af' },
  done:        { bg: '#dcfce7', color: '#15803d' },
}

export default function AdminPage() {
  const [view, setView] = useState<'items' | 'orders' | 'archive'>('items')
  const [items, setItems] = useState<MenuItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [archive, setArchive] = useState<Order[]>([])
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [filterCat, setFilterCat] = useState<'all' | 'bar' | 'kitchen'>('all')
  const [orderFilter, setOrderFilter] = useState<'active' | 'all'>('active')
  const [archiveCat, setArchiveCat] = useState<'all' | 'bar' | 'kitchen'>('all')
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

  async function loadArchive() {
    const res = await fetch('/api/orders?status=done')
    if (res.ok) setArchive(await res.json())
  }

  useEffect(() => { loadItems() }, [])
  useEffect(() => { if (view === 'orders') loadOrders() }, [view, orderFilter])
  useEffect(() => { if (view === 'archive') loadArchive() }, [view])

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
      price: item.price,
      available: item.available,
      sortOrder: item.sortOrder,
    })
    setShowForm(true)
  }

  async function uploadImage(file: File) {
    setUploading(true)
    try {
      const base64 = await resizeAndEncode(file, 600, 600, 0.82)
      setForm(f => ({ ...f, imageUrl: base64 }))
    } finally {
      setUploading(false)
    }
  }

  function resizeAndEncode(file: File, maxW: number, maxH: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      img.onload = () => {
        let { width, height } = img
        const ratio = Math.min(maxW / width, maxH / height, 1)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  async function saveItem() {
    setSaving(true)
    setSaveError('')
    const payload = {
      ...form,
      ingredients: form.ingredients.split('\n').map(s => s.trim()).filter(Boolean),
      steps: form.steps.split('\n').map(s => s.trim()).filter(Boolean),
    }
    try {
      const res = editingItem
        ? await fetch(`/api/menu-items/${editingItem.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
          })
        : await fetch('/api/menu-items', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
          })
      if (!res.ok) {
        const err = await res.text()
        setSaveError(`Fehler ${res.status}: ${err}`)
        setSaving(false)
        return
      }
    } catch (e) {
      setSaveError(`Verbindungsfehler: ${e}`)
      setSaving(false)
      return
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

  function printArchive() {
    window.print()
  }

  const filteredItems = filterCat === 'all' ? items : items.filter(i => i.category === filterCat)
  const filteredArchive = archiveCat === 'all' ? archive : archive.filter(o => o.category === archiveCat)

  const inputCls = 'w-full px-3 py-2 rounded-xl text-sm border border-gray-300 bg-white text-gray-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
  const labelCls = 'text-xs font-semibold uppercase tracking-wider block mb-1.5 text-gray-500'

  return (
    <>
      {/* Print styles – only archive list visible when printing */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .archive-print, .archive-print * { visibility: visible !important; }
          .archive-print { position: fixed; top: 0; left: 0; width: 100%; padding: 24px; }
        }
      `}</style>

      <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">← Display</a>
            <span className="text-xl font-bold text-amber-600">KARASAN</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">Admin</span>
          </div>
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            {([
              ['items', '🍽 Artikel'],
              ['orders', '📋 Bestellungen'],
              ['archive', '🗂 Archiv'],
            ] as const).map(([v, label]) => (
              <button key={v} onClick={() => setView(v)}
                className="px-4 py-2 text-sm font-medium transition-all border-r border-gray-200 last:border-r-0"
                style={{ background: view === v ? '#d97706' : '#fff', color: view === v ? '#fff' : '#6b7280' }}>
                {label}
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
                        background: filterCat === cat ? (cat === 'bar' ? '#d97706' : cat === 'kitchen' ? '#16a34a' : '#111827') : '#fff',
                        color: filterCat === cat ? '#fff' : '#6b7280',
                        borderColor: filterCat === cat ? 'transparent' : '#e5e7eb',
                      }}>
                      {cat === 'all' ? 'Alle' : cat === 'bar' ? '🍸 Bar' : '🌿 Küche'}
                    </button>
                  ))}
                </div>
                <button onClick={openNew}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: '#d97706' }}>
                  + Neuer Artikel
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    Noch keine Artikel. Klicke auf &quot;Neuer Artikel&quot;.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {['Bild', 'Name', 'Kategorie', 'Preis', 'Zutaten', 'Status', 'Aktionen'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item, idx) => (
                        <tr key={item.id} className={idx < filteredItems.length - 1 ? 'border-b border-gray-100' : ''}>
                          <td className="px-4 py-3">
                            <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100">
                              {item.imageUrl
                                ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                : <span className="text-xl">{item.category === 'bar' ? '🍸' : '🌿'}</span>
                              }
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{item.name}</p>
                            {item.description && <p className="text-xs mt-0.5 line-clamp-1 text-gray-400">{item.description}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                background: item.category === 'bar' ? '#fef3c7' : '#dcfce7',
                                color: item.category === 'bar' ? '#92400e' : '#166534',
                              }}>
                              {item.category === 'bar' ? '🍸 Bar' : '🌿 Küche'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-700">
                            {item.price > 0 ? `${item.price.toFixed(2)} €` : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {parseJson(item.ingredients).length} Zutaten · {parseJson(item.steps).length} Schritte
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => toggleAvailable(item)}
                              className="px-2 py-0.5 rounded-full text-xs font-medium border"
                              style={{
                                background: item.available ? '#dcfce7' : '#fee2e2',
                                color: item.available ? '#15803d' : '#dc2626',
                                borderColor: item.available ? '#bbf7d0' : '#fecaca',
                              }}>
                              {item.available ? '✓ Aktiv' : '✕ Inaktiv'}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => openEdit(item)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all">
                                ✏ Bearbeiten
                              </button>
                              <button onClick={() => deleteItem(item.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-all">
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
                      style={{
                        background: orderFilter === f ? '#d97706' : '#fff',
                        color: orderFilter === f ? '#fff' : '#6b7280',
                        borderColor: orderFilter === f ? 'transparent' : '#e5e7eb',
                      }}>
                      {f === 'active' ? 'Aktiv' : 'Alle'}
                    </button>
                  ))}
                </div>
                <button onClick={loadOrders} className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 bg-white text-gray-500 hover:bg-gray-50">
                  ↻ Aktualisieren
                </button>
              </div>
              {orders.length === 0 ? (
                <div className="text-center py-16 text-gray-400">Keine Bestellungen gefunden.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orders.map(order => (
                    <div key={order.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-bold" style={{ color: order.category === 'bar' ? '#d97706' : '#16a34a' }}>
                            Tisch {order.tableNumber}
                          </span>
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                            style={{
                              background: order.category === 'bar' ? '#fef3c7' : '#dcfce7',
                              color: order.category === 'bar' ? '#92400e' : '#166534',
                            }}>
                            {order.category === 'bar' ? 'Bar' : 'Küche'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(order.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <ul className="space-y-1 mb-3 text-sm text-gray-700">
                        {order.items.map(oi => (
                          <li key={oi.id} className="flex justify-between">
                            <span>{oi.menuItem.name}</span>
                            <span className="text-gray-400">×{oi.quantity}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: STATUS_STYLES[order.status]?.bg, color: STATUS_STYLES[order.status]?.color }}>
                          {STATUS_LABELS[order.status]}
                        </span>
                        {order.status !== 'done' && (
                          <button onClick={() => updateOrderStatus(order.id, order.status === 'pending' ? 'in_progress' : 'done')}
                            className="flex-1 text-xs py-1.5 rounded-lg font-semibold text-white"
                            style={{ background: '#d97706' }}>
                            {order.status === 'pending' ? '▶ Annehmen' : '✓ Fertig'}
                          </button>
                        )}
                        <button onClick={() => deleteOrder(order.id)}
                          className="text-xs px-2 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100">
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ARCHIVE VIEW ── */}
          {view === 'archive' && (
            <div className="space-y-4 archive-print">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {(['all', 'bar', 'kitchen'] as const).map(cat => (
                    <button key={cat} onClick={() => setArchiveCat(cat)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                      style={{
                        background: archiveCat === cat ? (cat === 'bar' ? '#d97706' : cat === 'kitchen' ? '#16a34a' : '#111827') : '#fff',
                        color: archiveCat === cat ? '#fff' : '#6b7280',
                        borderColor: archiveCat === cat ? 'transparent' : '#e5e7eb',
                      }}>
                      {cat === 'all' ? 'Alle' : cat === 'bar' ? '🍸 Bar' : '🌿 Küche'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={loadArchive} className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 bg-white text-gray-500 hover:bg-gray-50">
                    ↻ Laden
                  </button>
                  <button onClick={printArchive}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5"
                    style={{ background: '#d97706' }}>
                    🖨 Als PDF drucken
                  </button>
                </div>
              </div>

              {filteredArchive.length === 0 ? (
                <div className="text-center py-16 text-gray-400">Keine archivierten Bestellungen.</div>
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {filteredArchive.length} Bestellungen
                    </span>
                    <span className="text-xs text-gray-400 print-only-block hidden">
                      Gedruckt am {new Date().toLocaleDateString('de-DE')}
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Zeit', 'Tisch', 'Kategorie', 'Artikel', 'Menge'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredArchive.map((order, idx) => (
                        order.items.map((oi, oiIdx) => (
                          <tr key={`${order.id}-${oi.id}`}
                            className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${oiIdx < order.items.length - 1 ? 'border-b border-gray-50' : 'border-b border-gray-200'}`}>
                            {oiIdx === 0 ? (
                              <>
                                <td className="px-4 py-2 text-gray-500 text-xs" rowSpan={order.items.length}>
                                  {new Date(order.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}{' '}
                                  {new Date(order.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-4 py-2 font-semibold" rowSpan={order.items.length}
                                  style={{ color: order.category === 'bar' ? '#d97706' : '#16a34a' }}>
                                  {order.tableNumber}
                                </td>
                                <td className="px-4 py-2" rowSpan={order.items.length}>
                                  <span className="text-xs px-2 py-0.5 rounded-full"
                                    style={{
                                      background: order.category === 'bar' ? '#fef3c7' : '#dcfce7',
                                      color: order.category === 'bar' ? '#92400e' : '#166534',
                                    }}>
                                    {order.category === 'bar' ? 'Bar' : 'Küche'}
                                  </span>
                                </td>
                              </>
                            ) : null}
                            <td className="px-4 py-2 text-gray-800">{oi.menuItem.name}</td>
                            <td className="px-4 py-2 text-gray-500">×{oi.quantity}</td>
                          </tr>
                        ))
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── ITEM FORM MODAL ── */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-gray-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="font-bold text-lg text-gray-900">{editingItem ? 'Artikel bearbeiten' : 'Neuer Artikel'}</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {/* Image */}
                <div>
                  <label className={labelCls}>Bild</label>
                  <div className="flex gap-3 items-start">
                    <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-gray-100 border border-gray-200">
                      {form.imageUrl
                        ? <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" />
                        : <span className="text-3xl">{form.category === 'bar' ? '🍸' : '🌿'}</span>
                      }
                    </div>
                    <div className="flex-1 space-y-2">
                      <input ref={fileRef} type="file" accept="image/*" className="hidden"
                        onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                      <button onClick={() => fileRef.current?.click()} disabled={uploading}
                        className="w-full py-2 rounded-xl text-sm border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all">
                        {uploading ? '⏳ Wird hochgeladen…' : '📁 Bild hochladen'}
                      </button>
                      <input type="text" placeholder="oder URL eingeben"
                        value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                        className={inputCls} />
                    </div>
                  </div>
                </div>

                {/* Name + Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Name *</label>
                    <input type="text" placeholder="z.B. Martini" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Kategorie *</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className={inputCls}>
                      <option value="bar">🍸 Bar</option>
                      <option value="kitchen">🌿 Küche</option>
                    </select>
                  </div>
                </div>

                {/* Price + Description */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Preis (€)</label>
                    <input type="number" placeholder="0.00" min="0" step="0.10"
                      value={form.price || ''}
                      onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Beschreibung</label>
                    <input type="text" placeholder="Kurze Beschreibung" value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className={inputCls} />
                  </div>
                </div>

                {/* Ingredients */}
                <div>
                  <label className={labelCls}>
                    Zutaten <span className="text-gray-300 normal-case">(eine pro Zeile)</span>
                  </label>
                  <textarea rows={4} placeholder={'2cl Gin\n1cl Vermouth\nOlive'}
                    value={form.ingredients} onChange={e => setForm(f => ({ ...f, ingredients: e.target.value }))}
                    className={`${inputCls} resize-none`} />
                </div>

                {/* Steps */}
                <div>
                  <label className={labelCls}>
                    Zubereitungsschritte <span className="text-gray-300 normal-case">(einer pro Zeile)</span>
                  </label>
                  <textarea rows={4} placeholder={'Glas mit Eis kühlen\nZutaten in Shaker geben\n30 Sekunden schütteln'}
                    value={form.steps} onChange={e => setForm(f => ({ ...f, steps: e.target.value }))}
                    className={`${inputCls} resize-none`} />
                </div>

                {/* Notes */}
                <div>
                  <label className={labelCls}>Notizen</label>
                  <input type="text" placeholder="z.B. Bitte kalt servieren" value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className={inputCls} />
                </div>

                {saveError && (
                  <div className="px-4 py-3 rounded-xl text-sm bg-red-50 text-red-600 border border-red-200">
                    {saveError}
                  </div>
                )}

                {/* Available + Save */}
                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form.available}
                      onChange={e => setForm(f => ({ ...f, available: e.target.checked }))}
                      className="w-4 h-4 rounded accent-amber-500" />
                    Artikel aktiv (im Display sichtbar)
                  </label>
                  <div className="flex gap-3">
                    <button onClick={() => setShowForm(false)}
                      className="px-4 py-2 rounded-xl text-sm border border-gray-200 text-gray-500 bg-white hover:bg-gray-50">
                      Abbrechen
                    </button>
                    <button onClick={saveItem} disabled={!form.name.trim() || saving}
                      className="px-6 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                      style={{ background: '#d97706' }}>
                      {saving ? 'Speichert…' : '✓ Speichern'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
