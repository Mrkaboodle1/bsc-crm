'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'

const SOURCES: [string, string][] = [
  ['', '— how did they find us? —'], ['fb_ad', 'Facebook'], ['instagram', 'Instagram'], ['google', 'Google'],
  ['word_of_mouth', 'Word of mouth'], ['school', 'School'], ['walkin', 'Walk-in'], ['open_day', 'Open day'], ['other', 'Other'],
]
const STAGES: [string, string][] = [['lead', 'Lead'], ['trial', 'Trial'], ['active', 'Active'], ['paused', 'Paused'], ['past', 'Past'], ['lost', 'Lost']]
const inp = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none'

export function AddContactButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 bg-[#D72027] hover:bg-[#A0151B] text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm">
        <Plus size={16} /> Add Contact
      </button>
      {open && <Modal onClose={() => setOpen(false)} />}
    </>
  )
}

function Modal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const [f, setF] = useState({ name: '', primary_parent: '', email: '', phone: '', source: '', lifecycle_stage: 'lead', tags: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))

  async function save() {
    setErr(''); setBusy(true)
    try {
      const r = await fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Could not save')
      router.refresh(); onClose()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save') } finally { setBusy(false) }
  }

  if (!mounted) return null
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto text-left" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h3 className="font-bold text-zinc-900">Add a contact</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Name *"><input className={inp} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Sarah Murphy  (or a business / school name)" autoFocus /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone"><input className={inp} value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0400 000 000" /></Field>
            <Field label="Email"><input className={inp} value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="name@email.com" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="How they found us"><select className={inp} value={f.source} onChange={(e) => set('source', e.target.value)}>{SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Stage"><select className={inp} value={f.lifecycle_stage} onChange={(e) => set('lifecycle_stage', e.target.value)}>{STAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          </div>
          <Field label="Tags (optional)"><input className={inp} value={f.tags} onChange={(e) => set('tags', e.target.value)} placeholder="comma separated — e.g. friday drama, 2026 free trial" /></Field>
          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{err}</div>}
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-zinc-100">
          <button onClick={save} disabled={busy} className="bg-[#D72027] text-white font-semibold text-sm px-5 py-2.5 rounded-lg disabled:opacity-50 hover:bg-[#A0151B]">{busy ? 'Saving…' : 'Add contact'}</button>
          <button onClick={onClose} className="text-sm font-semibold text-zinc-500 hover:text-zinc-800">Cancel</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">{label}</label>{children}</div>
}
