'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { PRODUCTS, type Product } from '@/lib/store-products'

export function Storefront() {
  const [buy, setBuy] = useState<Product | null>(null)
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {PRODUCTS.map((p) => (
        <div key={p.id} className="bg-white rounded-2xl border border-zinc-200 p-5 flex flex-col">
          <div className="text-4xl mb-2">{p.emoji}</div>
          <h3 className="font-bold text-zinc-900">{p.name}</h3>
          <p className="text-sm text-zinc-500 mt-1 flex-1">{p.blurb}</p>
          <div className="flex items-center justify-between mt-4">
            <span className="text-xl font-extrabold text-zinc-900">${p.price}{p.unit ? <span className="text-xs font-medium text-zinc-400">/{p.unit}</span> : null}</span>
            <button onClick={() => setBuy(p)} className="bg-[#D72027] hover:bg-[#A0151B] text-white font-semibold text-sm px-4 py-2 rounded-lg">Buy</button>
          </div>
        </div>
      ))}
      {buy && <BuyModal product={buy} onClose={() => setBuy(null)} />}
    </div>
  )
}

function BuyModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', qty: '1' })
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const inp = 'w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-900'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!f.name || (!f.email && !f.phone)) return
    setState('sending')
    try {
      await fetch('/api/forms/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        formSlug: `store-${product.id}`, name: f.name, email: f.email, phone: f.phone,
        message: `🛍️ Order: ${f.qty} × ${product.name} ($${product.price} each = $${Number(f.qty) * product.price})`,
      }) })
    } catch { /* ignore */ }
    setState('done')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h3 className="font-bold text-zinc-900">{product.emoji} {product.name}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={18} /></button>
        </div>
        {state === 'done' ? (
          <div className="p-6 text-center"><div className="text-4xl mb-2">🎪</div><p className="font-bold text-zinc-900">Order received!</p><p className="text-sm text-zinc-600 mt-1">The Big Star team will confirm your <strong>{product.name}</strong> and payment shortly.</p></div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-3">
            <input className={inp} placeholder="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
            <input className={inp} placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <input className={inp} placeholder="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            <input className={inp} type="number" min="1" placeholder="Quantity" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} />
            <button disabled={state === 'sending'} className="w-full bg-[#D72027] text-white font-bold text-sm px-4 py-3 rounded-lg disabled:opacity-50">{state === 'sending' ? 'Sending…' : `Order — $${(Number(f.qty) || 1) * product.price}`}</button>
            <p className="text-[11px] text-zinc-400 text-center">We&apos;ll confirm and take payment directly. No card needed now.</p>
          </form>
        )}
      </div>
    </div>
  )
}
