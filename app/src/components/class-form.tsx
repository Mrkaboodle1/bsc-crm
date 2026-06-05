'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, X, Trash2 } from 'lucide-react'

export type Coach = { id: string; full_name: string | null }
export type ClassRecord = {
  id: string; name: string | null; discipline: string | null; day_of_week: number | null
  start_time: string | null; duration_minutes: number | null; age_min: number | null
  age_max: number | null; capacity: number | null; weekly_fee: number | null; primary_coach_id: string | null
}

const DISCIPLINES: [string, string][] = [
  ['circus_acro', 'Circus Acro'], ['aerial', 'Aerial'], ['fusion', 'Circus Fusion'], ['drama', 'Drama'],
  ['toddler', 'Toddler'], ['homeschool', 'Homeschool'], ['adult', 'Adult'], ['ndis', 'NDIS'],
  ['private', 'Private lesson'], ['show_programme', 'Show Programme'],
]
const DAYS: [number, string][] = [[1, 'Monday'], [2, 'Tuesday'], [3, 'Wednesday'], [4, 'Thursday'], [5, 'Friday'], [6, 'Saturday'], [0, 'Sunday']]
const inp = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none'

export function ClassFormButton({ coaches, editing, label, subtle, iconOnly }: { coaches: Coach[]; editing?: ClassRecord; label?: string; subtle?: boolean; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false)
  const trigger = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }
  return (
    <>
      {iconOnly ? (
        <button onClick={trigger} title="Edit or delete this class" aria-label="Edit class"
          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/90 text-zinc-700 shadow hover:bg-white hover:text-zinc-900">
          <Pencil size={13} />
        </button>
      ) : (
        <button
          onClick={trigger}
          className={subtle
            ? 'inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900'
            : 'inline-flex items-center gap-2 bg-[#D72027] text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm hover:bg-[#A0151B]'}
        >
          {editing ? <Pencil size={15} /> : <Plus size={16} />}{label ?? (editing ? 'Edit' : 'Add class')}
        </button>
      )}
      {open && <Modal coaches={coaches} editing={editing} onClose={() => setOpen(false)} />}
    </>
  )
}

function Modal({ coaches, editing, onClose }: { coaches: Coach[]; editing?: ClassRecord; onClose: () => void }) {
  const router = useRouter()
  const [f, setF] = useState({
    name: editing?.name || '', discipline: editing?.discipline || 'circus_acro',
    day_of_week: editing?.day_of_week ?? 1, start_time: (editing?.start_time || '15:45:00').slice(0, 5),
    duration_minutes: editing?.duration_minutes ?? 60, age_min: editing?.age_min ?? '', age_max: editing?.age_max ?? '',
    capacity: editing?.capacity ?? 10, weekly_fee: editing?.weekly_fee ?? '', primary_coach_id: editing?.primary_coach_id || '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const set = (k: string, v: string | number) => setF((p) => ({ ...p, [k]: v }))

  async function save() {
    setErr(''); setBusy(true)
    try {
      const r = await fetch('/api/classes', {
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
      const r = await fetch(`/api/classes?id=${encodeURIComponent(editing.id)}`, { method: 'DELETE' })
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
          <h3 className="font-bold text-zinc-900">{editing ? 'Edit class' : 'Add class or private lesson'}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Class name"><input className={inp} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Mon 3:45 Circus Acro 5-8" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type"><select className={inp} value={f.discipline} onChange={(e) => set('discipline', e.target.value)}>{DISCIPLINES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Coach"><select className={inp} value={f.primary_coach_id} onChange={(e) => set('primary_coach_id', e.target.value)}><option value="">— none —</option>{coaches.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}</select></Field>
            <Field label="Day"><select className={inp} value={f.day_of_week} onChange={(e) => set('day_of_week', Number(e.target.value))}>{DAYS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Start time"><input type="time" className={inp} value={f.start_time} onChange={(e) => set('start_time', e.target.value)} /></Field>
            <Field label="Duration (min)"><input type="number" className={inp} value={f.duration_minutes} onChange={(e) => set('duration_minutes', Number(e.target.value))} /></Field>
            <Field label="Capacity"><input type="number" className={inp} value={f.capacity} onChange={(e) => set('capacity', Number(e.target.value))} /></Field>
            <Field label="Age from"><input type="number" className={inp} value={String(f.age_min)} onChange={(e) => set('age_min', e.target.value)} /></Field>
            <Field label="Age to"><input type="number" className={inp} value={String(f.age_max)} onChange={(e) => set('age_max', e.target.value)} /></Field>
            <Field label="Weekly fee ($)"><input type="number" className={inp} value={String(f.weekly_fee)} onChange={(e) => set('weekly_fee', e.target.value)} /></Field>
          </div>
          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{err}</div>}
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-zinc-100">
          <button onClick={save} disabled={busy} className="bg-[#D72027] text-white font-semibold text-sm px-5 py-2.5 rounded-lg disabled:opacity-50">{busy ? 'Saving…' : editing ? 'Save changes' : 'Add class'}</button>
          <button onClick={onClose} className="text-sm font-semibold text-zinc-500 hover:text-zinc-800">Cancel</button>
          {editing && (
            <div className="ml-auto">
              {confirmDel ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Delete this class?</span>
                  <button onClick={remove} disabled={busy} className="inline-flex items-center gap-1.5 bg-red-600 text-white font-semibold text-sm px-3 py-2 rounded-lg disabled:opacity-50 hover:bg-red-700"><Trash2 size={14} /> Yes, delete</button>
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
