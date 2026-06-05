'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, X } from 'lucide-react'
import { APPT_TYPE_META } from '@/lib/calendar'
import { CLASS_TYPE_META } from '@/lib/calendar'
import { termFor, termWeek, schoolHolidayFor, publicHolidayFor, significanceFor, isHolidayWorkshopDay } from '@/lib/au-calendar'
import { recurringEventsFor } from '@/lib/recurring-events'
import { AppointmentModal, type ApptCoach, type ApptRecord } from '@/components/appointment-modal'

export type ApptRow = {
  id: string; title: string; type: string; start_at: string; end_at: string; all_day: boolean
  location: string | null; description: string | null; notes: string | null; fee: number | null
  assigned_coach_id: string | null; coach_name: string | null
}
export type ClassRow = {
  id: string; name: string; discipline: string; day_of_week: number
  start_time: string; duration_minutes: number; coach_name: string | null
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const YEARS = [2026, 2027, 2028, 2029]

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (y: number, m0: number, d: number) => `${y}-${pad(m0 + 1)}-${pad(d)}`

// Brisbane (UTC+10) date key + time from an ISO timestamp.
function brisParts(iso: string) {
  const d = new Date(iso)
  const key = d.toLocaleDateString('en-CA', { timeZone: 'Australia/Brisbane' }) // YYYY-MM-DD
  const time = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Australia/Brisbane' }).replace(' ', '')
  const hhmm = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Brisbane' }) // 24h HH:MM
  return { key, time, hhmm }
}
function fmtClassTime(start: string) {
  const [h, m] = start.split(':').map((x) => parseInt(x, 10))
  const period = h >= 12 ? 'pm' : 'am'
  const dh = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${dh}:${pad(m)}${period}`
}

type DayEvent =
  | { kind: 'class'; id: string; title: string; type: string; time: string; sort: number; coach: string | null }
  | { kind: 'holiday'; id: string; title: string; type: string; time: string; sort: number; coach: string | null }
  | { kind: 'recurring'; id: string; title: string; type: string; time: string; endLabel: string; sort: number; coach: string | null; location: string; note?: string }
  | { kind: 'appt'; id: string; title: string; type: string; time: string; sort: number; appt: ApptRow }

export function CalendarMonth({
  appointments, classes, coaches, isManager,
}: {
  appointments: ApptRow[]
  classes: ClassRow[]
  coaches: ApptCoach[]
  isManager: boolean
}) {
  const today = new Date()
  const todayKey = today.toLocaleDateString('en-CA', { timeZone: 'Australia/Brisbane' })
  const [year, setYear] = useState(Math.min(Math.max(today.getFullYear(), 2026), 2029))
  const [month, setMonth] = useState(today.getMonth())

  const [modal, setModal] = useState<{ editing?: ApptRecord; date?: string } | null>(null)
  const [dayOpen, setDayOpen] = useState<string | null>(null)

  // Bucket appointments by Brisbane date key (spread across multi-day ranges).
  const apptsByDay = useMemo(() => {
    const map: Record<string, ApptRow[]> = {}
    for (const a of appointments) {
      const start = brisParts(a.start_at).key
      const end = brisParts(a.end_at).key
      let cur = start
      for (let guard = 0; guard < 60; guard++) {
        ;(map[cur] ||= []).push(a)
        if (cur >= end) break
        const [yy, mm, dd] = cur.split('-').map((x) => parseInt(x, 10))
        cur = (() => { const dt = new Date(Date.UTC(yy, mm - 1, dd + 1)); return dt.toISOString().slice(0, 10) })()
      }
    }
    return map
  }, [appointments])

  // Events on a given date string. During school holidays the weekly classes &
  // private lessons don't run — instead a 9am–3pm School Holiday Workshop is
  // shown on the short-break weekdays. Appointments always show.
  function eventsFor(dateStr: string): DayEvent[] {
    const [yy, mm, dd] = dateStr.split('-').map((x) => parseInt(x, 10))
    const dow = new Date(yy, mm - 1, dd).getDay() // 0=Sun..6=Sat (Brisbane local for user)
    const out: DayEvent[] = []
    const onHoliday = schoolHolidayFor(dateStr)
    if (!onHoliday) {
      for (const c of classes) {
        if (c.day_of_week === dow) {
          const [h, m] = c.start_time.split(':').map((x) => parseInt(x, 10))
          out.push({ kind: 'class', id: c.id, title: c.name, type: c.discipline, time: fmtClassTime(c.start_time), sort: h * 60 + m, coach: c.coach_name })
        }
      }
    } else if (isHolidayWorkshopDay(dateStr)) {
      out.push({ kind: 'holiday', id: `hw-${dateStr}`, title: 'School Holiday Workshop', type: 'holiday_programme', time: '9:00am–3:00pm', sort: 540, coach: null })
    }
    for (const a of apptsByDay[dateStr] ?? []) {
      const p = brisParts(a.start_at)
      out.push({ kind: 'appt', id: a.id, title: a.title, type: a.type, time: a.all_day ? 'All day' : p.time, sort: a.all_day ? -1 : new Date(a.start_at).getTime() % 86_400_000, appt: a })
    }
    for (const re of recurringEventsFor(dateStr)) {
      out.push({ kind: 'recurring', id: `re-${re.title}-${dateStr}`, title: re.title, type: re.type, time: re.startLabel, endLabel: re.endLabel, sort: re.sortMin, coach: re.coach, location: re.location, note: re.note })
    }
    return out.sort((x, y) => x.sort - y.sort)
  }

  // Build the 6-week grid (Mon-first).
  const cells = useMemo(() => {
    const first = new Date(year, month, 1)
    const offset = (first.getDay() + 6) % 7 // Mon=0
    const start = new Date(year, month, 1 - offset)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
      return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate(), key: ymd(d.getFullYear(), d.getMonth(), d.getDate()), inMonth: d.getMonth() === month }
    })
  }, [year, month])

  // Period context for the header (which term / holiday this month covers).
  const periodChips = useMemo(() => {
    const seen = new Set<string>()
    const chips: { label: string; cls: string }[] = []
    for (let d = 1; d <= 31; d++) {
      const ds = ymd(year, month, d)
      if (!ds.startsWith(`${year}-${pad(month + 1)}`)) break
      const t = termFor(ds)
      if (t) { const l = `Term ${t.term}`; if (!seen.has(l)) { seen.add(l); chips.push({ label: l, cls: 'bg-[#D72027] text-white' }) } }
      const h = schoolHolidayFor(ds)
      if (h) { if (!seen.has(h.label)) { seen.add(h.label); chips.push({ label: h.label, cls: 'bg-amber-200 text-amber-900' }) } }
    }
    return chips
  }, [year, month])

  function go(delta: number) {
    let m = month + delta, y = year
    if (m < 0) { m = 11; y-- } else if (m > 11) { m = 0; y++ }
    if (y < 2026) { y = 2026; m = 0 } else if (y > 2029) { y = 2029; m = 11 }
    setYear(y); setMonth(m)
  }
  function jumpToday() { setYear(Math.min(Math.max(today.getFullYear(), 2026), 2029)); setMonth(today.getMonth()) }

  function toRecord(a: ApptRow): ApptRecord {
    const s = brisParts(a.start_at), e = brisParts(a.end_at)
    return {
      id: a.id, title: a.title, type: a.type, date: s.key, end_date: e.key, all_day: a.all_day,
      start_time: s.hhmm, end_time: e.hhmm, location: a.location, description: a.description,
      notes: a.notes, assigned_coach_id: a.assigned_coach_id, fee: a.fee,
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-1">
          <button onClick={() => go(-1)} className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-600"><ChevronLeft size={18} /></button>
          <button onClick={() => go(1)} className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-600"><ChevronRight size={18} /></button>
        </div>
        <h2 className="text-xl font-bold text-zinc-900 min-w-[160px]">{MONTHS[month]} <span className="text-zinc-400 font-semibold">{year}</span></h2>
        <button onClick={jumpToday} className="text-sm font-semibold text-zinc-600 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50">Today</button>
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} className="text-sm font-semibold text-zinc-700 border border-zinc-200 rounded-lg px-2 py-1.5 bg-white">
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="flex items-center gap-1.5 ml-1">
          {periodChips.map((c, i) => <span key={i} className={`text-[11px] font-bold px-2 py-1 rounded ${c.cls}`}>{c.label}</span>)}
        </div>
        {isManager && (
          <button onClick={() => setModal({ date: todayKey.startsWith(`${year}-${pad(month + 1)}`) ? todayKey : ymd(year, month, 1) })}
            className="ml-auto inline-flex items-center gap-2 bg-[#D72027] text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm hover:bg-[#A0151B]">
            <Plus size={16} /> Add to calendar
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-zinc-100 bg-zinc-50">
          {WEEKDAYS.map((w) => <div key={w} className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-zinc-400">{w}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            const events = eventsFor(cell.key)
            const ph = publicHolidayFor(cell.key)
            const hol = schoolHolidayFor(cell.key)
            const sig = significanceFor(cell.key)
            const isToday = cell.key === todayKey
            const isWeekend = idx % 7 >= 5
            const bg = !cell.inMonth ? 'bg-zinc-50/60' : ph ? 'bg-red-50/50' : hol ? 'bg-amber-50/50' : isWeekend ? 'bg-zinc-50/40' : 'bg-white'
            return (
              <button
                key={cell.key}
                onClick={() => setDayOpen(cell.key)}
                className={`relative text-left min-h-[104px] border-b border-r border-zinc-100 p-1.5 align-top hover:bg-zinc-50/80 transition-colors ${bg} ${idx % 7 === 6 ? 'border-r-0' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center justify-center text-xs font-bold w-6 h-6 rounded-full ${isToday ? 'bg-[#D72027] text-white' : cell.inMonth ? 'text-zinc-700' : 'text-zinc-300'}`}>{cell.d}</span>
                  {ph && <span className="text-[8px] font-bold text-red-500 uppercase tracking-wide truncate max-w-[68px]" title={ph.name}>{ph.name.replace(/ \(.*\)/, '')}</span>}
                </div>
                {/* significance — faint background hint */}
                {sig.length > 0 && (
                  <div className="text-[8px] text-zinc-400 leading-tight truncate" title={sig.map((s) => s.name).join(', ')}>{sig[0]!.name}{sig.length > 1 ? ` +${sig.length - 1}` : ''}</div>
                )}
                <div className="mt-0.5 space-y-0.5">
                  {events.slice(0, 3).map((ev) => {
                    const dot = ev.kind === 'appt' || ev.kind === 'recurring' ? (APPT_TYPE_META[ev.type]?.dot ?? 'bg-zinc-400') : ev.kind === 'holiday' ? 'bg-orange-500' : 'bg-blue-400'
                    return (
                      <div key={ev.kind + ev.id} className="flex items-center gap-1 text-[10px] text-zinc-700 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                        <span className="text-zinc-400 shrink-0">{ev.time !== 'All day' ? ev.time : ''}</span>
                        <span className="truncate font-medium">{ev.kind === 'class' ? ev.title.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+[\d:.]+\s*(am|pm)?\s*/i, '') : ev.title}</span>
                      </div>
                    )
                  })}
                  {events.length > 3 && <div className="text-[10px] font-semibold text-zinc-400">+{events.length - 3} more</div>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" /> Class</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#D72027]" /> Show</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Gig</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Private lesson</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /> Holiday workshop</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200" /> School holidays</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-50 border border-red-200" /> Public holiday</span>
        <span className="text-zinc-400">· faint grey = cultural &amp; religious dates</span>
      </div>

      {/* Day detail panel */}
      {dayOpen && (
        <DayPanel
          dateStr={dayOpen}
          events={eventsFor(dayOpen)}
          isManager={isManager}
          onClose={() => setDayOpen(null)}
          onAdd={() => { setModal({ date: dayOpen }); setDayOpen(null) }}
          onEditAppt={(a) => { setModal({ editing: toRecord(a) }); setDayOpen(null) }}
        />
      )}

      {/* Add / edit modal */}
      {modal && isManager && (
        <AppointmentModal coaches={coaches} editing={modal.editing} defaultDate={modal.date} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

function DayPanel({
  dateStr, events, isManager, onClose, onAdd, onEditAppt,
}: {
  dateStr: string
  events: DayEvent[]
  isManager: boolean
  onClose: () => void
  onAdd: () => void
  onEditAppt: (a: ApptRow) => void
}) {
  const [yy, mm, dd] = dateStr.split('-').map((x) => parseInt(x, 10))
  const date = new Date(yy, mm - 1, dd)
  const heading = date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const t = termFor(dateStr)
  const hol = schoolHolidayFor(dateStr)
  const ph = publicHolidayFor(dateStr)
  const sig = significanceFor(dateStr)

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-zinc-100 px-5 py-4 flex items-start justify-between">
          <div>
            <h3 className="font-bold text-zinc-900">{heading}</h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {t && <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#D72027] text-white">Term {t.term} · Wk {termWeek(dateStr, t)}</span>}
              {hol && <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">{hol.label}</span>}
              {ph && <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">{ph.name}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-2">
          {events.length === 0 && <p className="text-sm text-zinc-400 py-6 text-center">Nothing on this day.</p>}
          {events.map((ev) => {
            if (ev.kind === 'holiday') {
              return (
                <div key={'h' + ev.id} className="flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50/50 px-3 py-2.5">
                  <span className="text-xl">🏕</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-800 truncate">{ev.title}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-orange-100 text-orange-800">Holiday</span>
                    </div>
                    <div className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5"><Clock size={12} /> {ev.time}</div>
                    <p className="text-xs text-zinc-400 mt-0.5 italic">Regular classes &amp; private lessons don&apos;t run during the school holidays.</p>
                  </div>
                </div>
              )
            }
            if (ev.kind === 'recurring') {
              const rm = APPT_TYPE_META[ev.type] ?? APPT_TYPE_META.other
              return (
                <div key={'r' + ev.id} className="flex items-start gap-3 rounded-xl border border-zinc-100 px-3 py-2.5">
                  <span className="text-xl">{rm.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-800 truncate">{ev.title}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${rm.cls}`}>{rm.label}</span>
                    </div>
                    <div className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5"><Clock size={12} /> {ev.time}–{ev.endLabel}{ev.coach ? ` · ${ev.coach}` : ''}</div>
                    {ev.location && <div className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5"><MapPin size={12} /> {ev.location}</div>}
                    {ev.note && <p className="text-xs text-zinc-400 mt-0.5 italic">{ev.note}</p>}
                  </div>
                  <span className="text-[10px] font-bold text-zinc-300 self-center">Weekly</span>
                </div>
              )
            }
            const meta = ev.kind === 'appt' ? (APPT_TYPE_META[ev.type] ?? APPT_TYPE_META.other) : (CLASS_TYPE_META[ev.type] ?? { emoji: '🎪', label: ev.type, cls: 'bg-blue-100 text-blue-800' })
            if (ev.kind === 'class') {
              return (
                <a key={'c' + ev.id} href={`/roll-call/${ev.id}`} className="flex items-start gap-3 rounded-xl border border-zinc-100 px-3 py-2.5 hover:bg-zinc-50">
                  <span className="text-xl">{meta.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-zinc-800 truncate">{ev.title}</div>
                    <div className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5"><Clock size={12} /> {ev.time}{ev.coach ? ` · ${ev.coach}` : ''}</div>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 self-center">Roll →</span>
                </a>
              )
            }
            const a = ev.appt
            return (
              <button key={'a' + ev.id} onClick={() => isManager ? onEditAppt(a) : undefined} className={`w-full text-left flex items-start gap-3 rounded-xl border border-zinc-100 px-3 py-2.5 ${isManager ? 'hover:bg-zinc-50' : ''}`}>
                <span className="text-xl">{meta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-zinc-800 truncate">{a.title}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${meta.cls}`}>{meta.label}</span>
                  </div>
                  <div className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5"><Clock size={12} /> {ev.time}{a.coach_name ? ` · ${a.coach_name}` : ''}</div>
                  {a.location && <div className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5"><MapPin size={12} /> {a.location}</div>}
                  {a.description && <p className="text-xs text-zinc-600 mt-1">{a.description}</p>}
                  {a.notes && <p className="text-xs text-zinc-400 mt-0.5 italic">{a.notes}</p>}
                </div>
                {isManager && <span className="text-[10px] font-bold text-zinc-400 self-center">Edit</span>}
              </button>
            )
          })}

          {/* significance footnote */}
          {sig.length > 0 && (
            <div className="pt-2 mt-1 border-t border-zinc-100">
              <div className="text-[10px] uppercase tracking-wide font-bold text-zinc-300 mb-1">Also today</div>
              {sig.map((s, i) => <div key={i} className="text-xs text-zinc-400">{s.name} <span className="text-zinc-300">· {s.group}</span></div>)}
            </div>
          )}

          {isManager && (
            <button onClick={onAdd} className="w-full mt-3 inline-flex items-center justify-center gap-2 bg-zinc-900 text-white font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-800">
              <Plus size={16} /> Add to this day
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
