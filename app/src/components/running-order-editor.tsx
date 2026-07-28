'use client'

import { useState, useRef } from 'react'
import type { RunningOrderRow, Activity, OrderTemplate } from '@/lib/workshop-activities'
import { GripVertical, Trash2, Plus, ChevronUp, ChevronDown, ListChecks, Save, BookmarkCheck, X } from 'lucide-react'

// Client copy of the standard 9am–3pm template (so coaches can load & customise).
const TEMPLATE: Array<{ time_label: string; activity: string }> = [
  { time_label: '9:00 AM', activity: 'Sign In / Free Play' },
  { time_label: '9:15 AM', activity: 'Warm Up Games' },
  { time_label: '9:30 AM', activity: 'Circus Skills Rotation 1' },
  { time_label: '10:30 AM', activity: 'Morning Tea' },
  { time_label: '11:00 AM', activity: 'Circus Skills Rotation 2' },
  { time_label: '12:00 PM', activity: 'Lunch' },
  { time_label: '12:30 PM', activity: 'Creative Activity / Craft' },
  { time_label: '1:15 PM', activity: 'Circus Skills Rotation 3' },
  { time_label: '2:15 PM', activity: 'Group Challenge / Show Creation' },
  { time_label: '2:45 PM', activity: 'Pack Up / Parent Collection' },
  { time_label: '3:00 PM', activity: 'Sign Out' },
]

export function RunningOrderEditor({ workshopId, initial, activities, templates: initialTemplates }: { workshopId: string; initial: RunningOrderRow[]; activities: Activity[]; templates: OrderTemplate[] }) {
  const [rows, setRows] = useState<RunningOrderRow[]>(initial)
  const [tpls, setTpls] = useState<OrderTemplate[]>(initialTemplates)
  const [busy, setBusy] = useState(false)
  const drag = useRef<number | null>(null)
  const [over, setOver] = useState<number | null>(null)

  async function bulkSet(items: Array<{ time_label: string; activity: string }>, replace: boolean) {
    setBusy(true)
    const r = await fetch('/api/workshops/running-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workshop_id: workshopId, replace, rows: items.map((t, i) => ({ ...t, sort_order: i * 10 })) }) })
    const j = await r.json(); setBusy(false)
    if (j.ok && j.rows) setRows(j.rows)
    else alert(j.error || 'Could not update the running order')
  }
  const loadTemplate = () => bulkSet(TEMPLATE, false)

  async function addRow(activity = 'New item', activity_id: string | null = null) {
    const sort = (rows[rows.length - 1]?.sort_order ?? 0) + 10
    const r = await fetch('/api/workshops/running-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workshop_id: workshopId, time_label: '', activity, activity_id, sort_order: sort }) })
    const j = await r.json()
    if (j.ok && j.row) setRows((xs) => [...xs, j.row])
    else alert(j.error || 'Could not add')
  }
  function patchField(id: string, field: 'time_label' | 'activity', value: string) {
    setRows((xs) => xs.map((x) => x.id === id ? { ...x, [field]: value } : x))
    fetch('/api/workshops/running-order', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, [field]: value }) }).catch(() => {})
  }
  function removeRow(id: string) {
    setRows((xs) => xs.filter((x) => x.id !== id))
    fetch(`/api/workshops/running-order?id=${id}`, { method: 'DELETE' }).catch(() => {})
  }
  function persistOrder(next: RunningOrderRow[]) {
    const reordered = next.map((x, i) => ({ ...x, sort_order: i * 10 }))
    setRows(reordered)
    fetch('/api/workshops/running-order', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reorder: reordered.map((x) => ({ id: x.id, sort_order: x.sort_order })) }) }).catch(() => {})
  }
  function moveTo(from: number, to: number) {
    if (to < 0 || to >= rows.length || from === to) return
    const next = [...rows]; const [m] = next.splice(from, 1); next.splice(to, 0, m)
    persistOrder(next)
  }

  // ── Saved running orders (templates) ──
  async function saveAsTemplate() {
    if (!rows.length) { alert('Add some items first, then save them as a running order.'); return }
    const name = window.prompt('Name this running order (e.g. "Rodrigo\'s running order")')
    if (!name?.trim()) return
    const r = await fetch('/api/workshops/order-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), items: rows.map((x) => ({ time_label: x.time_label, activity: x.activity })) }) })
    const j = await r.json()
    if (j.ok && j.template) setTpls((xs) => [...xs, j.template])
    else alert(j.error || 'Could not save')
  }
  async function applyTemplate(t: OrderTemplate) {
    if (rows.length && !confirm(`Use “${t.name}” for this day? It replaces the current running order.`)) return
    await bulkSet(t.items || [], true)
  }
  async function deleteTemplate(t: OrderTemplate) {
    if (!confirm(`Delete the saved running order “${t.name}”?`)) return
    setTpls((xs) => xs.filter((x) => x.id !== t.id))
    fetch(`/api/workshops/order-templates?id=${t.id}`, { method: 'DELETE' }).catch(() => {})
  }

  // Bar of saved orders — shown in both empty and filled states.
  const savedBar = (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-400 inline-flex items-center gap-1"><BookmarkCheck size={12} /> Saved orders:</span>
      {tpls.length === 0 && <span className="text-xs text-zinc-400 italic">none yet</span>}
      {tpls.map((t) => (
        <span key={t.id} className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold pl-2.5 pr-1 py-1 rounded-lg">
          <button onClick={() => applyTemplate(t)} disabled={busy} title="Use this running order for this day" className="hover:underline">{t.name}</button>
          <button onClick={() => deleteTemplate(t)} title="Delete this saved order" className="text-amber-400 hover:text-red-600"><X size={12} /></button>
        </span>
      ))}
    </div>
  )

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-3">
        <div className="text-center">
          <ListChecks size={26} className="mx-auto text-zinc-300 mb-2" />
          <p className="text-sm text-zinc-600 font-semibold">No running order for this day yet.</p>
          <p className="text-xs text-zinc-400 mb-3">Use a saved order, start from the standard template, or build your own.</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button onClick={loadTemplate} disabled={busy} className="bg-[#D72027] text-white font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-50">{busy ? 'Loading…' : 'Load standard template'}</button>
            <button onClick={() => addRow()} className="bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-xl">Start blank</button>
          </div>
        </div>
        {tpls.length > 0 && <div className="border-t border-zinc-100 pt-3">{savedBar}</div>}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
      <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-100 text-[10px] font-extrabold uppercase tracking-wide text-zinc-500">📋 Daily running order · drag or use arrows to reorder</div>
      <ul>
        {rows.map((r, i) => (
          <li key={r.id}
            draggable
            onDragStart={() => { drag.current = i }}
            onDragEnd={() => { drag.current = null; setOver(null) }}
            onDragOver={(e) => { e.preventDefault(); if (over !== i) setOver(i) }}
            onDrop={() => { if (drag.current !== null) moveTo(drag.current, i); drag.current = null; setOver(null) }}
            className={`flex items-center gap-2 px-3 py-2 border-b border-zinc-50 ${over === i ? 'bg-emerald-50' : ''}`}>
            <span className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500 shrink-0"><GripVertical size={15} /></span>
            <div className="flex flex-col shrink-0">
              <button onClick={() => moveTo(i, i - 1)} disabled={i === 0} className="text-zinc-300 hover:text-zinc-600 disabled:opacity-30 leading-none"><ChevronUp size={14} /></button>
              <button onClick={() => moveTo(i, i + 1)} disabled={i === rows.length - 1} className="text-zinc-300 hover:text-zinc-600 disabled:opacity-30 leading-none"><ChevronDown size={14} /></button>
            </div>
            <input
              defaultValue={r.time_label}
              onBlur={(e) => { if (e.target.value !== r.time_label) patchField(r.id, 'time_label', e.target.value) }}
              placeholder="time"
              className="w-20 shrink-0 px-2 py-1.5 text-sm font-bold text-zinc-900 border border-transparent hover:border-zinc-200 focus:border-[#D72027] rounded-lg focus:outline-none" />
            <input
              defaultValue={r.activity}
              onBlur={(e) => { if (e.target.value !== r.activity) patchField(r.id, 'activity', e.target.value) }}
              placeholder="what's happening"
              className="flex-1 min-w-0 px-2 py-1.5 text-sm text-zinc-700 border border-transparent hover:border-zinc-200 focus:border-[#D72027] rounded-lg focus:outline-none" />
            <button onClick={() => removeRow(r.id)} className="shrink-0 p-1.5 text-zinc-300 hover:text-red-600" title="Remove"><Trash2 size={14} /></button>
          </li>
        ))}
      </ul>
      <div className="p-3 space-y-3 bg-zinc-50/60">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => addRow()} className="inline-flex items-center gap-1.5 bg-zinc-900 text-white text-xs font-bold px-3 py-2 rounded-lg"><Plus size={14} /> Add item</button>
          {activities.length > 0 && (
            <select defaultValue="" onChange={(e) => { const a = activities.find((x) => x.id === e.target.value); if (a) addRow(`${a.icon || ''} ${a.title}`.trim(), a.id); e.target.value = '' }} className="text-xs font-semibold border border-zinc-200 rounded-lg px-2 py-2 bg-white text-zinc-700">
              <option value="">+ Add from activity library…</option>
              {activities.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.title}</option>)}
            </select>
          )}
          <button onClick={saveAsTemplate} className="inline-flex items-center gap-1.5 bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-lg ml-auto"><Save size={14} /> Save this order</button>
        </div>
        <div className="border-t border-zinc-100 pt-3">{savedBar}</div>
        <p className="text-[11px] text-zinc-400">Tap a time or activity to edit it. Save an order to reuse it on other days.</p>
      </div>
    </div>
  )
}
