'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { X, Trash2 } from 'lucide-react'
import { APPT_TYPE_META } from '@/lib/calendar'

export type ApptCoach = { id: string; full_name: string | null }
export type ApptRecord = {
  id: string
  title: string
  type: string
  date: string          // YYYY-MM-DD (Brisbane)
  end_date: string      // YYYY-MM-DD (Brisbane)
  all_day: boolean
  start_time: string    // HH:MM
  end_time: string      // HH:MM
  location: string | null
  description: string | null
  notes: string | null
  assigned_coach_id: string | null
  fee: number | null
}

const TYPE_ORDER = ['event', 'gig', 'show', 'private_lesson', 'rehearsal', 'workshop', 'birthday_party', 'kno', 'meeting', 'holiday_programme', 'personal', 'other']
const inp = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none'

export function AppointmentModal({
  coaches, editing, defaultDate, onClose,
}: {
  coaches: ApptCoach[]
  editing?: ApptRecord
  defaultDate?: string
  onClose: () => void
}) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const [f, setF] = useState({
    title: editing?.title ?? '',
    type: editing?.type ?? 'event',
    date: editing?.date ?? defaultDate ?? new Date().toISOString().slice(0, 10),
    end_date: editing?.end_date ?? editing?.date ?? defaultDate ?? new Date().toISOString().slice(0, 10),
    all_day: editing?.all_day ?? false,
    start_time: editing?.start_time ?? '09:00',
    end_time: editing?.end_time ?? '10:00',
    location: editing?.location ?? '',
    description: editing?.description ?? '',
    notes: editing?.notes ?? '',
    assigned_coach_id: editing?.assigned_coach_id ?? '',
    fee: editing?.fee != null ? String(editing.fee) : '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)
  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }))

  async function save() {
    setErr(''); setBusy(true)
    try {
      const r = await fetch('/api/appointments', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { id: editing.id, ...f } : f),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Could not save')
      router.refresh(); onClose()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save') } finally { setBusy(false) }
  }

  async function remove() {
    if (!editing) return
    setErr(''); setBusy(true)
    try {
      const r = await fetch(`/api/appointments?id=${encodeURIComponent(editing.id)}`, { method: 'DELETE' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Could not delete')
      router.refresh(); onClose()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not delete') } finally { setBusy(false) }
  }

  if (!mounted) return null
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto text-left" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h3 className="font-bold text-zinc-900">{editing ? 'Edit event' : 'Add to calendar'}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="What is it?"><input className={inp} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. School fete gig — Mudgeeraba" autoFocus /></Field>

          <Field label="Type">
            <select className={inp} value={f.type} onChange={(e) => set('type', e.target.value)}>
              {TYPE_ORDER.map((k) => <option key={k} value={k}>{APPT_TYPE_META[k]?.emoji} {APPT_TYPE_META[k]?.label}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Date"><input type="date" className={inp} value={f.date} onChange={(e) => { set('date', e.target.value); if (f.end_date < e.target.value) set('end_date', e.target.value) }} /></Field>
            <Field label="End date"><input type="date" className={inp} value={f.end_date} min={f.date} onChange={(e) => set('end_date', e.target.value)} /></Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" checked={f.all_day} onChange={(e) => set('all_day', e.target.checked)} className="w-4 h-4 rounded" />
            All day
          </label>

          {!f.all_day && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start time"><input type="time" className={inp} value={f.start_time} onChange={(e) => set('start_time', e.target.value)} /></Field>
              <Field label="End time"><input type="time" className={inp} value={f.end_time} onChange={(e) => set('end_time', e.target.value)} /></Field>
            </div>
          )}

          <Field label="Location"><input className={inp} value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Holy Spirit School, Mudgeeraba" /></Field>

          <Field label="Description"><input className={inp} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Short summary (e.g. roving + balloons, 45 min)" /></Field>

          <Field label="Notes"><textarea className={inp} rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Anything to remember — what to bring, contact, deposit paid…" /></Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Who's running it">
              <select className={inp} value={f.assigned_coach_id} onChange={(e) => set('assigned_coach_id', e.target.value)}>
                <option value="">— anyone —</option>
                {coaches.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </Field>
            <Field label="Fee ($)"><input type="number" className={inp} value={f.fee} onChange={(e) => set('fee', e.target.value)} placeholder="optional" /></Field>
          </div>

          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{err}</div>}
        </div>

        <div className="flex items-center gap-3 px-5 py-4 border-t border-zinc-100">
          <button onClick={save} disabled={busy} className="bg-[#D72027] text-white font-semibold text-sm px-5 py-2.5 rounded-lg disabled:opacity-50 hover:bg-[#A0151B]">{busy ? 'Saving…' : editing ? 'Save changes' : 'Add to calendar'}</button>
          <button onClick={onClose} className="text-sm font-semibold text-zinc-500 hover:text-zinc-800">Cancel</button>
          {editing && (
            <div className="ml-auto">
              {confirmDel ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Delete?</span>
                  <button onClick={remove} disabled={busy} className="inline-flex items-center gap-1.5 bg-red-600 text-white font-semibold text-sm px-3 py-2 rounded-lg disabled:opacity-50 hover:bg-red-700"><Trash2 size={14} /> Yes</button>
                  <button onClick={() => setConfirmDel(false)} className="text-sm font-semibold text-zinc-500 hover:text-zinc-800">No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDel(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700"><Trash2 size={15} /> Delete</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">{label}</label>{children}</div>
}
