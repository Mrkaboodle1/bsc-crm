'use client'

import { useState, useEffect } from 'react'
import { Phone, Mail, Check } from 'lucide-react'

// Coach-editable parent contact for a student (so a coach can fix mum/dad's
// phone or email right from the lesson/roll page).
export function ParentContact({ studentId }: { studentId: string }) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [parent, setParent] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [none, setNone] = useState(false)

  useEffect(() => {
    let on = true
    fetch(`/api/student-contact?student_id=${studentId}`).then((r) => r.json()).then((j) => {
      if (!on) return
      if (j.ok && j.family) { setEmail(j.family.email ?? ''); setPhone(j.family.phone ?? ''); setParent(j.family.primary_parent ?? '') }
      else setNone(true)
      setLoaded(true)
    }).catch(() => on && setLoaded(true))
    return () => { on = false }
  }, [studentId])

  async function save() {
    setBusy(true); setSaved(false)
    const r = await fetch('/api/student-contact', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: studentId, email, phone }) })
    setBusy(false)
    if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 1500) }
    else { const j = await r.json().catch(() => ({})); alert(j.error || 'Could not save') }
  }

  if (!loaded) return null
  const inp = 'w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#D72027]'
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-500">👪 Parent contact{parent ? ` · ${parent}` : ''}</div>
        {saved && <span className="text-[10px] font-bold text-emerald-600 inline-flex items-center gap-1"><Check size={12} /> Saved</span>}
      </div>
      {none ? (
        <p className="text-xs text-zinc-400">This child isn&apos;t linked to a family record yet, so there&apos;s nothing to edit here.</p>
      ) : (
        <div className="space-y-2">
          <div className="grid sm:grid-cols-2 gap-2">
            <div className="relative"><Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" /><input className={inp} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Parent phone" /></div>
            <div className="relative"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" /><input className={inp} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Parent email" /></div>
          </div>
          <button onClick={save} disabled={busy} className="bg-zinc-900 text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-50">{busy ? 'Saving…' : 'Save contact'}</button>
        </div>
      )}
    </div>
  )
}
