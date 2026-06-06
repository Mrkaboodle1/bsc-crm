'use client'

import { useState } from 'react'

export type FormField = { id: string; type: string; label: string; required?: boolean; options?: string[]; placeholder?: string }

export function PublicFormRenderer({ slug, fields }: { slug: string; fields: FormField[] }) {
  const [vals, setVals] = useState<Record<string, string>>({})
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const set = (id: string, v: string) => setVals((p) => ({ ...p, [id]: v }))
  const inp = 'w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-900'

  function toggleCheckbox(id: string, opt: string) {
    const cur = (vals[id] ?? '').split('||').filter(Boolean)
    const next = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt]
    set(id, next.join('||'))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    // required check
    for (const f of fields) {
      if (f.required && f.type !== 'heading' && !(vals[f.id] ?? '').trim()) { setState('error'); return }
    }
    const emailF = fields.find((f) => f.type === 'email')
    const phoneF = fields.find((f) => f.type === 'phone')
    const nameF = fields.find((f) => f.type === 'short_text' && /name/i.test(f.label)) ?? fields.find((f) => f.type === 'short_text')
    const name = nameF ? (vals[nameF.id] ?? '') : ''
    const email = emailF ? (vals[emailF.id] ?? '') : ''
    const phone = phoneF ? (vals[phoneF.id] ?? '') : ''
    const message = fields.filter((f) => f.type !== 'heading' && (vals[f.id] ?? '').trim())
      .map((f) => `${f.label}: ${(vals[f.id] ?? '').replace(/\|\|/g, ', ')}`).join('\n')

    if (!name && !email && !phone) { setState('error'); return }
    setState('sending')
    try {
      const r = await fetch('/api/forms/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ formSlug: slug, name, email, phone, message }) })
      if (!r.ok) throw new Error()
      setState('done')
    } catch { setState('error') }
  }

  if (state === 'done') {
    return <div className="text-center py-10"><div className="text-5xl mb-3">🎪</div><h2 className="text-xl font-extrabold text-zinc-900">Thank you!</h2><p className="text-zinc-600 mt-2">We&apos;ve got your details and the Big Star team will be in touch soon.</p></div>
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {fields.map((f) => {
        if (f.type === 'heading') return <h3 key={f.id} className="text-sm font-extrabold text-zinc-900 pt-2 border-t border-zinc-100 first:border-0 first:pt-0">{f.label}</h3>
        const req = f.required ? <span className="text-[#D72027]"> *</span> : null
        return (
          <div key={f.id}>
            <label className="block text-xs font-semibold text-zinc-600 mb-1.5">{f.label}{req}</label>
            {f.type === 'long_text' ? (
              <textarea className={inp} rows={3} value={vals[f.id] ?? ''} placeholder={f.placeholder} onChange={(e) => set(f.id, e.target.value)} />
            ) : f.type === 'dropdown' ? (
              <select className={inp} value={vals[f.id] ?? ''} onChange={(e) => set(f.id, e.target.value)}>
                <option value="">— choose —</option>
                {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.type === 'checkboxes' ? (
              <div className="space-y-1.5">
                {(f.options ?? []).map((o) => {
                  const on = (vals[f.id] ?? '').split('||').includes(o)
                  return <label key={o} className="flex items-center gap-2 text-sm text-zinc-700"><input type="checkbox" checked={on} onChange={() => toggleCheckbox(f.id, o)} className="w-4 h-4" /> {o}</label>
                })}
              </div>
            ) : f.type === 'consent' ? (
              <label className="flex items-start gap-2 text-sm text-zinc-700"><input type="checkbox" checked={vals[f.id] === 'yes'} onChange={(e) => set(f.id, e.target.checked ? 'yes' : '')} className="w-4 h-4 mt-0.5" /> {f.placeholder || 'I agree'}</label>
            ) : (
              <input className={inp} type={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'} value={vals[f.id] ?? ''} placeholder={f.placeholder} onChange={(e) => set(f.id, e.target.value)} />
            )}
          </div>
        )
      })}
      {state === 'error' && <p className="text-sm text-red-600">Please fill in the required fields (and a name + email or phone).</p>}
      <button type="submit" disabled={state === 'sending'} className="w-full bg-[#D72027] hover:bg-[#A0151B] text-white font-extrabold text-sm px-5 py-3.5 rounded-xl shadow-md disabled:opacity-50">{state === 'sending' ? 'Sending…' : 'Submit'}</button>
      <p className="text-[11px] text-zinc-400 text-center">Big Star Circus · Molendinar, Gold Coast</p>
    </form>
  )
}
