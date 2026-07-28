'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, X, CalendarPlus } from 'lucide-react'
import type { CoachDay } from '@/lib/coach-portal'

const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

const TABS = [
  { key: 'workshop', label: '🎪 Holiday Workshops' },
  { key: 'kno', label: '🌙 Kids Night Out' },
  { key: 'event', label: '🎉 Events' },
] as const
type TabKey = (typeof TABS)[number]['key']

export function CoachDaysList({ days, canManage }: { days: CoachDay[]; canManage: boolean }) {
  // default to the first tab that has any days
  const firstWith = (TABS.find((t) => days.some((d) => d.category === t.key))?.key) || 'workshop'
  const router = useRouter()
  const [tab, setTab] = useState<TabKey>(firstWith)
  const [addOpen, setAddOpen] = useState(false)
  const [copying, setCopying] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const thisYear = new Date().getFullYear()
  async function copyYear() {
    if (!confirm(`Copy all of ${thisYear}'s workshops, Kids Night Out & events into ${thisYear + 1}? They'll come in fresh (no kids), ready for you to adjust the dates.`)) return
    setCopying(true)
    const r = await fetch('/api/workshops/duplicate-year', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from_year: thisYear, to_year: thisYear + 1 }) })
    const j = await r.json(); setCopying(false)
    if (j.ok) { alert(`Done — created ${j.created} day(s) for ${j.to}. Tweak the dates as needed.`); router.refresh() }
    else alert(j.error || 'Could not copy')
  }
  const counts = { workshop: days.filter((d) => d.category === 'workshop').length, kno: days.filter((d) => d.category === 'kno').length, event: days.filter((d) => d.category === 'event').length }
  const shown = days.filter((d) => d.category === tab)

  return (
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-5">
        <div className="inline-flex bg-zinc-100 rounded-full p-1 text-sm font-bold flex-wrap">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-3.5 py-1.5 rounded-full transition-colors ${tab === t.key ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-800'}`}>
              {t.label} <span className={`ml-1 text-xs ${tab === t.key ? 'text-zinc-400' : 'text-zinc-400'}`}>{counts[t.key]}</span>
            </button>
          ))}
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button onClick={copyYear} disabled={copying} className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-3 py-2.5 rounded-lg hover:bg-zinc-50 disabled:opacity-50" title={`Copy ${thisYear} → ${thisYear + 1}`}><CalendarPlus size={15} /> {copying ? 'Copying…' : `Copy to ${thisYear + 1}`}</button>
            <button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-2 bg-[#D72027] text-white font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-[#A0151B]"><Plus size={15} /> Add event</button>
          </div>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center text-sm text-zinc-500">
          {tab === 'event' ? 'No events yet — tap “Add event” to create one (sausage sizzle, birthday party, open day…).' : `No upcoming ${tab === 'kno' ? 'Kids Night Out' : 'Holiday Workshop'} days.`}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
          {shown.map((d) => {
            const isToday = d.date === today
            return (
              <Link key={d.id} href={`/coach-portal/${d.id}`} className={`block bg-white rounded-2xl border-2 p-5 hover:shadow-md transition-shadow ${isToday ? 'border-[#D72027]' : 'border-zinc-200'}`}>
                {isToday && <span className="inline-block text-[10px] font-extrabold uppercase tracking-wide bg-[#D72027] text-white px-2 py-0.5 rounded mb-2">Today</span>}
                <div className="text-lg font-extrabold text-zinc-900">{fmt(d.date)}</div>
                <div className="text-sm text-zinc-500 mt-0.5">{d.title}</div>
                <div className="text-xs text-zinc-400 mt-1">{d.start_time?.slice(0, 5)}–{d.end_time?.slice(0, 5)}</div>
                <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">👧 {d.kids} kids</div>
              </Link>
            )
          })}
        </div>
      )}

      {addOpen && <AddEventModal onClose={() => setAddOpen(false)} />}
    </div>
  )
}

function AddEventModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [f, setF] = useState({ title: '', date: '', start_time: '09:00', end_time: '15:00', capacity: '30' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  async function save() {
    if (!f.title.trim()) { setErr('Give the event a name'); return }
    if (!f.date) { setErr('Pick a date'); return }
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/workshops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, kind: 'event', member_price: 0, public_price: 0, status: 'open' }) })
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'Could not save') }
      onClose(); router.refresh()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Error'); setBusy(false) }
  }
  const inp = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none'
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-100"><h3 className="font-extrabold text-zinc-900">Add an event</h3><button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={20} /></button></div>
        <div className="p-5 space-y-3">
          <label className="block"><span className="text-xs font-semibold text-zinc-600">Event name *</span><input className={inp} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Sausage Sizzle, BSC Birthday Party, Open Day" autoFocus /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-xs font-semibold text-zinc-600">Date *</span><input type="date" className={inp} value={f.date} onChange={(e) => set('date', e.target.value)} /></label>
            <label className="block"><span className="text-xs font-semibold text-zinc-600">Capacity</span><input type="number" className={inp} value={f.capacity} onChange={(e) => set('capacity', e.target.value)} /></label>
            <label className="block"><span className="text-xs font-semibold text-zinc-600">Start</span><input type="time" className={inp} value={f.start_time} onChange={(e) => set('start_time', e.target.value)} /></label>
            <label className="block"><span className="text-xs font-semibold text-zinc-600">Finish</span><input type="time" className={inp} value={f.end_time} onChange={(e) => set('end_time', e.target.value)} /></label>
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={busy} className="bg-[#D72027] text-white font-semibold text-sm px-5 py-2.5 rounded-lg disabled:opacity-50">{busy ? 'Adding…' : 'Add event'}</button>
            <button onClick={onClose} className="text-sm font-semibold text-zinc-500 px-4">Cancel</button>
          </div>
          <p className="text-[11px] text-zinc-400">It'll appear under the <strong>Events</strong> tab with its own sign-in/out list — same as a workshop day.</p>
        </div>
      </div>
    </div>
  )
}
