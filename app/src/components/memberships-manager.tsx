'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import type { MembershipPlan } from '@/lib/pos'

const PERIODS = ['weekly', 'fortnightly', 'monthly', 'term', 'yearly', 'one_off']
const periodLabel: Record<string, string> = { weekly: '/week', fortnightly: '/fortnight', monthly: '/month', term: '/term', yearly: '/year', one_off: ' one-off' }
const inputCls = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none'
const money = (n: number) => `$${Number(n).toFixed(Number(n) % 1 === 0 ? 0 : 2)}`

export function MembershipsManager({ plans, canManage }: { plans: MembershipPlan[]; canManage: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Partial<MembershipPlan> & { perksText?: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!editing?.name) return
    setBusy(true)
    try {
      const isNew = !editing.id
      const payload = { ...editing, perks: (editing.perksText ?? (editing.perks ?? []).join('\n')) }
      await fetch('/api/membership-plans', { method: isNew ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      setEditing(null); router.refresh()
    } finally { setBusy(false) }
  }
  async function remove(id: string) {
    if (!window.confirm('Remove this plan?')) return
    await fetch(`/api/membership-plans?id=${id}`, { method: 'DELETE' }); router.refresh()
  }

  return (
    <div>
      {canManage && (
        <button onClick={() => setEditing({ name: '', price: 0, billing_period: 'weekly', perks: [], perksText: '' })} className="inline-flex items-center gap-1.5 bg-zinc-900 text-white font-semibold text-sm px-4 py-2 rounded-lg mb-5"><Plus size={15} /> Add plan</button>
      )}

      {plans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center text-sm text-zinc-500">No membership plans yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.filter((p) => p.active).map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-zinc-200 p-5 flex flex-col">
              <div className="flex items-start justify-between">
                <h3 className="font-extrabold text-zinc-900">{p.name}</h3>
                {canManage && (
                  <div className="flex gap-1">
                    <button onClick={() => setEditing({ ...p, perksText: (p.perks ?? []).join('\n') })} className="text-zinc-400 hover:text-zinc-800 p-1"><Pencil size={14} /></button>
                    <button onClick={() => remove(p.id)} className="text-zinc-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
              <div className="mt-1 mb-3"><span className="text-3xl font-extrabold text-[#D72027]">{money(p.price)}</span><span className="text-sm text-zinc-500">{periodLabel[p.billing_period] ?? ''}</span></div>
              {p.description && <p className="text-sm text-zinc-600 mb-3">{p.description}</p>}
              <ul className="space-y-1.5 text-sm text-zinc-700 mt-auto">
                {(p.perks ?? []).map((perk, i) => <li key={i} className="flex items-start gap-2"><Check size={15} className="text-emerald-500 mt-0.5 shrink-0" /> {perk}</li>)}
                {p.class_credits != null && <li className="flex items-start gap-2 font-semibold"><Check size={15} className="text-emerald-500 mt-0.5 shrink-0" /> {p.class_credits} class credits</li>}
              </ul>
            </div>
          ))}
        </div>
      )}

      {editing && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-zinc-100">
              <h3 className="font-extrabold text-zinc-900">{editing.id ? 'Edit plan' : 'New plan'}</h3>
              <button onClick={() => setEditing(null)} className="text-zinc-400 hover:text-zinc-700"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <label className="block"><span className="text-xs font-semibold text-zinc-600">Plan name</span><input className={inputCls} value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block"><span className="text-xs font-semibold text-zinc-600">Price ($)</span><input type="number" className={inputCls} value={editing.price ?? ''} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></label>
                <label className="block"><span className="text-xs font-semibold text-zinc-600">Billing</span><select className={inputCls} value={editing.billing_period ?? 'weekly'} onChange={(e) => setEditing({ ...editing, billing_period: e.target.value })}>{PERIODS.map((p) => <option key={p} value={p}>{p.replace('_', '-')}</option>)}</select></label>
              </div>
              <label className="block"><span className="text-xs font-semibold text-zinc-600">Description</span><input className={inputCls} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label>
              <label className="block"><span className="text-xs font-semibold text-zinc-600">What’s included (one per line)</span><textarea rows={4} className={inputCls} value={editing.perksText ?? ''} onChange={(e) => setEditing({ ...editing, perksText: e.target.value })} placeholder={'1 class each week\nSibling discount'} /></label>
              <label className="block"><span className="text-xs font-semibold text-zinc-600">Class credits (leave blank for unlimited)</span><input type="number" className={inputCls} value={editing.class_credits ?? ''} onChange={(e) => setEditing({ ...editing, class_credits: e.target.value === '' ? null : Number(e.target.value) })} /></label>
              <div className="flex gap-2 pt-1">
                <button onClick={save} disabled={busy} className="bg-[#D72027] text-white font-semibold text-sm px-5 py-2.5 rounded-lg disabled:opacity-50">{busy ? 'Saving…' : 'Save plan'}</button>
                <button onClick={() => setEditing(null)} className="text-sm font-semibold text-zinc-500 px-4">Cancel</button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
