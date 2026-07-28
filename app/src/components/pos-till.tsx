'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Search, Plus, Minus, Trash2, X, Pencil, Settings2, Receipt } from 'lucide-react'
import type { Product } from '@/lib/pos'

type CartLine = { product_id: string | null; name: string; price: number; qty: number; emoji?: string | null }
type Pay = 'cash' | 'card' | 'account' | 'gift'

const PAY_LABELS: Record<Pay, string> = { cash: 'Cash', card: 'Card', account: 'On account', gift: 'Gift card' }
const money = (n: number) => `$${n.toFixed(2)}`

export function PosTill({ products, canManage, todayCount, todayTotal }: {
  products: Product[]; canManage: boolean; todayCount: number; todayTotal: number
}) {
  const router = useRouter()
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [pay, setPay] = useState<Pay>('cash')
  const [discount, setDiscount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState('')
  const [manage, setManage] = useState(false)

  const cats = useMemo(() => ['all', ...Array.from(new Set(products.map((p) => p.category)))], [products])
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return products.filter((p) => (cat === 'all' || p.category === cat) && (!s || p.name.toLowerCase().includes(s)))
  }, [products, cat, q])

  const subtotal = cart.reduce((a, l) => a + l.price * l.qty, 0)
  const total = Math.max(0, subtotal - discount)

  function add(p: Product) {
    setCart((c) => {
      const i = c.findIndex((l) => l.product_id === p.id)
      if (i >= 0) { const n = [...c]; n[i] = { ...n[i], qty: n[i].qty + 1 }; return n }
      return [...c, { product_id: p.id, name: p.name, price: Number(p.price), qty: 1, emoji: p.emoji }]
    })
  }
  function setQty(idx: number, d: number) {
    setCart((c) => c.map((l, i) => i === idx ? { ...l, qty: Math.max(0, l.qty + d) } : l).filter((l) => l.qty > 0))
  }

  async function checkout() {
    if (cart.length === 0) return
    setBusy(true); setFlash('')
    try {
      const r = await fetch('/api/pos/sale', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: cart, payment_method: pay, discount }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Could not record sale')
      setFlash(`✓ Sale recorded — ${money(j.total)} (${PAY_LABELS[pay]})`)
      setCart([]); setDiscount(0); router.refresh()
      setTimeout(() => setFlash(''), 4000)
    } catch (e) { setFlash(e instanceof Error ? e.message : 'Error') } finally { setBusy(false) }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-4">
      {/* Catalogue */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-full"><Receipt size={14} /> Today: {todayCount} sales · {money(todayTotal)}</span>
          </div>
          {canManage && <button onClick={() => setManage(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50"><Settings2 size={15} /> Manage products</button>}
        </div>

        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="w-full pl-9 pr-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none" />
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${cat === c ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-400'}`}>{c}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {shown.map((p) => (
            <button key={p.id} onClick={() => add(p)} className="bg-white border border-zinc-200 rounded-xl p-3 text-left hover:border-[#D72027] hover:shadow-sm transition active:scale-95">
              <div className="text-2xl mb-1">{p.emoji || '🏷️'}</div>
              <div className="font-bold text-sm text-zinc-900 leading-tight line-clamp-2">{p.name}</div>
              <div className="text-[#D72027] font-extrabold text-sm mt-1">{money(Number(p.price))}</div>
            </button>
          ))}
          {shown.length === 0 && <div className="col-span-full text-sm text-zinc-400 italic py-10 text-center">No products match.</div>}
        </div>
      </div>

      {/* Cart */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 h-fit lg:sticky lg:top-4">
        <h2 className="text-sm font-extrabold text-zinc-700 tracking-widest mb-3">CART ({cart.reduce((a, l) => a + l.qty, 0)})</h2>
        {cart.length === 0 ? (
          <div className="text-sm text-zinc-400 italic py-8 text-center">Tap products to add them.</div>
        ) : (
          <ul className="space-y-1.5 mb-3 max-h-[40vh] overflow-y-auto">
            {cart.map((l, i) => (
              <li key={i} className="flex items-center gap-2 bg-zinc-50 rounded-lg px-2.5 py-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-zinc-900 truncate">{l.emoji} {l.name}</div>
                  <div className="text-xs text-zinc-500">{money(l.price)} each</div>
                </div>
                <button onClick={() => setQty(i, -1)} className="w-6 h-6 rounded bg-white border border-zinc-200 flex items-center justify-center"><Minus size={12} /></button>
                <span className="w-5 text-center text-sm font-bold">{l.qty}</span>
                <button onClick={() => setQty(i, 1)} className="w-6 h-6 rounded bg-white border border-zinc-200 flex items-center justify-center"><Plus size={12} /></button>
                <span className="w-14 text-right text-sm font-bold">{money(l.price * l.qty)}</span>
                <button onClick={() => setCart((c) => c.filter((_, x) => x !== i))} className="text-zinc-400 hover:text-red-600"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-1.5 text-sm border-t border-zinc-100 pt-3">
          <div className="flex justify-between text-zinc-500"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div className="flex justify-between items-center text-zinc-500">
            <span>Discount</span>
            <div className="flex items-center gap-1">$<input type="number" min={0} value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value) || 0)} className="w-16 px-2 py-1 border border-zinc-200 rounded text-right" /></div>
          </div>
          <div className="flex justify-between text-lg font-extrabold text-zinc-900 pt-1"><span>Total</span><span>{money(total)}</span></div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 my-3">
          {(Object.keys(PAY_LABELS) as Pay[]).map((p) => (
            <button key={p} onClick={() => setPay(p)} className={`text-sm font-semibold py-2 rounded-lg border ${pay === p ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-200 text-zinc-600'}`}>{PAY_LABELS[p]}</button>
          ))}
        </div>

        <button onClick={checkout} disabled={busy || cart.length === 0} className="w-full bg-[#D72027] hover:bg-[#A0151B] text-white font-extrabold py-3 rounded-xl disabled:opacity-40">
          {busy ? 'Saving…' : `Take payment · ${money(total)}`}
        </button>
        {flash && <div className={`mt-2 text-sm text-center font-semibold ${flash.startsWith('✓') ? 'text-emerald-600' : 'text-red-600'}`}>{flash}</div>}
      </div>

      {manage && <ManageProducts products={products} onClose={() => setManage(false)} />}
    </div>
  )
}

// ── Product management modal ────────────────────────────────────────────────
const CATEGORIES = ['merch', 'class', 'ticket', 'pass', 'food', 'gift', 'other']
const inputCls = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none'

function ManageProducts({ products, onClose }: { products: Product[]; onClose: () => void }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Partial<Product> | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!editing?.name) return
    setBusy(true)
    try {
      const isNew = !editing.id
      await fetch('/api/products', {
        method: isNew ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      })
      setEditing(null); router.refresh()
    } finally { setBusy(false) }
  }
  async function remove(id: string) {
    if (!window.confirm('Remove this product from the till and shop?')) return
    await fetch(`/api/products?id=${id}`, { method: 'DELETE' }); router.refresh()
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-100">
          <h3 className="font-extrabold text-zinc-900">Manage products</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={20} /></button>
        </div>

        {editing ? (
          <div className="p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block"><span className="text-xs font-semibold text-zinc-600">Name</span><input className={inputCls} value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
              <label className="block"><span className="text-xs font-semibold text-zinc-600">Price ($)</span><input type="number" className={inputCls} value={editing.price ?? ''} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></label>
              <label className="block"><span className="text-xs font-semibold text-zinc-600">Category</span>
                <select className={inputCls} value={editing.category ?? 'merch'} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}</select>
              </label>
              <label className="block"><span className="text-xs font-semibold text-zinc-600">Emoji / icon</span><input className={inputCls} value={editing.emoji ?? ''} onChange={(e) => setEditing({ ...editing, emoji: e.target.value })} placeholder="👕" /></label>
            </div>
            <label className="block"><span className="text-xs font-semibold text-zinc-600">Description</span><input className={inputCls} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={editing.in_pos ?? true} onChange={(e) => setEditing({ ...editing, in_pos: e.target.checked })} /> Show on till</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={editing.in_shop ?? true} onChange={(e) => setEditing({ ...editing, in_shop: e.target.checked })} /> Show in online shop</label>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={save} disabled={busy} className="bg-[#D72027] text-white font-semibold text-sm px-5 py-2.5 rounded-lg disabled:opacity-50">{busy ? 'Saving…' : 'Save product'}</button>
              <button onClick={() => setEditing(null)} className="text-sm font-semibold text-zinc-500 px-4">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="p-5">
            <button onClick={() => setEditing({ name: '', price: 0, category: 'merch', in_pos: true, in_shop: true })} className="inline-flex items-center gap-1.5 bg-zinc-900 text-white font-semibold text-sm px-4 py-2 rounded-lg mb-4"><Plus size={15} /> Add product</button>
            <ul className="divide-y divide-zinc-100">
              {products.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-xl">{p.emoji || '🏷️'}</span>
                  <div className="flex-1 min-w-0"><div className="font-semibold text-sm text-zinc-900 truncate">{p.name}</div><div className="text-xs text-zinc-500 capitalize">{p.category} · {money(Number(p.price))}{p.in_pos ? ' · till' : ''}{p.in_shop ? ' · shop' : ''}</div></div>
                  <button onClick={() => setEditing(p)} className="text-zinc-400 hover:text-zinc-800 p-1.5"><Pencil size={15} /></button>
                  <button onClick={() => remove(p.id)} className="text-zinc-400 hover:text-red-600 p-1.5"><Trash2 size={15} /></button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
