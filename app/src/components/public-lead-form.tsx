'use client'

import { useState } from 'react'

export function PublicLeadForm({ formSlug, accent = '#D72027' }: { formSlug: string; accent?: string }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', childAge: '', message: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  const inp = 'w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-900'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!f.name.trim() || (!f.email.trim() && !f.phone.trim())) { setState('error'); return }
    setState('sending')
    try {
      const r = await fetch('/api/forms/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, formSlug }) })
      if (!r.ok) throw new Error()
      setState('done')
    } catch { setState('error') }
  }

  if (state === 'done') {
    return (
      <div className="text-center py-10">
        <div className="text-5xl mb-3">🎪</div>
        <h2 className="text-xl font-extrabold text-zinc-900">Thank you!</h2>
        <p className="text-zinc-600 mt-2">We&apos;ve got your details and the Big Star team will be in touch very soon.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Your name *</label>
        <input className={inp} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Parent / guardian name" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Email</label><input className={inp} type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="you@email.com" /></div>
        <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Phone</label><input className={inp} value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0400 000 000" /></div>
      </div>
      <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Child&apos;s age</label><input className={inp} value={f.childAge} onChange={(e) => set('childAge', e.target.value)} placeholder="e.g. 7" /></div>
      <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Anything you&apos;d like us to know?</label><textarea className={inp} rows={3} value={f.message} onChange={(e) => set('message', e.target.value)} placeholder="Which class / day suits you, questions…" /></div>
      {state === 'error' && <p className="text-sm text-red-600">Please add your name and an email or phone, then try again.</p>}
      <button type="submit" disabled={state === 'sending'} className="w-full text-white font-extrabold text-sm px-5 py-3.5 rounded-xl shadow-md disabled:opacity-50" style={{ background: accent }}>
        {state === 'sending' ? 'Sending…' : 'Send my enquiry'}
      </button>
      <p className="text-[11px] text-zinc-400 text-center">Big Star Circus · Molendinar, Gold Coast</p>
    </form>
  )
}
