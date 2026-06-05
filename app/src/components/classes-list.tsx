'use client'

import { useMemo, useState } from 'react'
import { Search, Lock } from 'lucide-react'
import { ClassFormButton, type Coach, type ClassRecord } from '@/components/class-form'

export type ClassListRow = ClassRecord & { coach_name: string | null }

const DAY_ORDER: [number, string][] = [[1, 'Monday'], [2, 'Tuesday'], [3, 'Wednesday'], [4, 'Thursday'], [5, 'Friday'], [6, 'Saturday'], [0, 'Sunday']]

const DISC: Record<string, { label: string; badge: string; dot: string }> = {
  circus_acro:    { label: 'Circus Acro',    badge: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500' },
  aerial:         { label: 'Aerial',         badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  fusion:         { label: 'Circus Fusion',  badge: 'bg-sky-100 text-sky-700',       dot: 'bg-sky-500' },
  drama:          { label: 'Drama',          badge: 'bg-teal-100 text-teal-700',     dot: 'bg-teal-500' },
  toddler:        { label: 'Toddler',        badge: 'bg-pink-100 text-pink-700',     dot: 'bg-pink-500' },
  homeschool:     { label: 'Homeschool',     badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  adult:          { label: 'Adult',          badge: 'bg-zinc-200 text-zinc-700',     dot: 'bg-zinc-500' },
  ndis:           { label: 'NDIS',           badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  private:        { label: 'Private lesson', badge: 'bg-amber-100 text-amber-800',   dot: 'bg-amber-500' },
  show_programme: { label: 'Show Programme', badge: 'bg-rose-100 text-rose-700',     dot: 'bg-rose-500' },
}
const discMeta = (d: string | null) => DISC[d || ''] ?? { label: d || '—', badge: 'bg-zinc-100 text-zinc-600', dot: 'bg-zinc-400' }

function fmt(t: string | null) {
  if (!t) return ''
  const [h, m] = t.split(':'); const hr = parseInt(h, 10)
  return `${hr > 12 ? hr - 12 : hr === 0 ? 12 : hr}:${m}${hr >= 12 ? 'pm' : 'am'}`
}
function endTime(start: string | null, dur: number | null) {
  if (!start) return ''
  const [h, m] = start.split(':').map((x) => parseInt(x, 10))
  const total = h * 60 + m + (dur ?? 60)
  const eh = Math.floor(total / 60) % 24, em = total % 60
  return `${eh > 12 ? eh - 12 : eh === 0 ? 12 : eh}:${String(em).padStart(2, '0')}${eh >= 12 ? 'pm' : 'am'}`
}
// Tidy display name: drop the leading lock emoji + the redundant weekday/time
// and "Private —" prefix that the columns/badge already convey.
function cleanName(name: string | null, discipline: string | null) {
  if (!name) return ''
  const n = name.replace(/^[^\p{L}\p{N}]+/u, '') // strip leading emoji/symbols/space
  if (discipline === 'private') {
    return n.replace(/^private\s*[—–-]\s*/i, '').replace(/\s*\([^)]*\)\s*$/, '').trim() || n
  }
  return n.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d{1,2}:\d{2}\s*/i, '').trim() || n
}
function initials(name: string | null) {
  if (!name) return '—'
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
}
const COACH_TINT = ['bg-rose-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-teal-500']
function coachTint(name: string | null) {
  if (!name) return 'bg-zinc-400'
  let h = 0; for (const ch of name) h = (h + ch.charCodeAt(0)) % COACH_TINT.length
  return COACH_TINT[h]!
}

export function ClassesList({ classes, coaches }: { classes: ClassListRow[]; coaches: Coach[] }) {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'all' | 'class' | 'private'>('all')

  const counts = useMemo(() => ({
    all: classes.length,
    private: classes.filter((c) => c.discipline === 'private').length,
    class: classes.filter((c) => c.discipline !== 'private').length,
  }), [classes])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return classes.filter((c) => {
      if (tab === 'private' && c.discipline !== 'private') return false
      if (tab === 'class' && c.discipline === 'private') return false
      if (!s) return true
      return (c.name || '').toLowerCase().includes(s) || (c.coach_name || '').toLowerCase().includes(s) || discMeta(c.discipline).label.toLowerCase().includes(s)
    })
  }, [classes, q, tab])

  const groups = useMemo(() => DAY_ORDER.map(([dow, label]) => ({
    dow, label,
    rows: filtered.filter((c) => c.day_of_week === dow).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')),
  })).filter((g) => g.rows.length > 0), [filtered])

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search class or coach…" className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none" />
        </div>
        <div className="inline-flex rounded-lg border border-zinc-200 overflow-hidden text-sm font-semibold">
          {([['all', `All ${counts.all}`], ['class', `Classes ${counts.class}`], ['private', `Private ${counts.private}`]] as const).map(([k, lbl]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 ${tab === k ? 'bg-[#D72027] text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'}`}>{lbl}</button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 px-4 py-12 text-center text-zinc-400">No classes match — try a different search.</div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.dow} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-100">
                <h3 className="text-sm font-bold text-zinc-800">{g.label}</h3>
                <span className="text-xs font-semibold text-zinc-400">{g.rows.length} {g.rows.length === 1 ? 'class' : 'classes'}</span>
              </div>
              <ul className="divide-y divide-zinc-50">
                {g.rows.map((c) => {
                  const meta = discMeta(c.discipline)
                  return (
                    <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50/70">
                      <span className={`w-1.5 h-9 rounded-full shrink-0 ${meta.dot}`} />
                      <div className="w-28 shrink-0">
                        <div className="text-sm font-bold text-zinc-800 tabular-nums">{fmt(c.start_time)}</div>
                        <div className="text-[11px] text-zinc-400 tabular-nums">to {endTime(c.start_time, c.duration_minutes)}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {c.discipline === 'private' && <Lock size={12} className="text-amber-500 shrink-0" />}
                          <span className="font-semibold text-sm text-zinc-900 truncate">{cleanName(c.name, c.discipline)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${meta.badge}`}>{meta.label}</span>
                          {(c.age_min != null || c.age_max != null) && <span className="text-[11px] text-zinc-400">Ages {c.age_min ?? '?'}–{c.age_max ?? '?'}</span>}
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 w-40 shrink-0">
                        <span className={`w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 ${coachTint(c.coach_name)}`}>{initials(c.coach_name)}</span>
                        <span className="text-sm text-zinc-600 truncate">{c.coach_name || '—'}</span>
                      </div>
                      <div className="w-12 shrink-0 text-center">
                        <div className="text-sm font-semibold text-zinc-700 tabular-nums">{c.capacity}</div>
                        <div className="text-[10px] text-zinc-400 uppercase tracking-wide">cap</div>
                      </div>
                      <ClassFormButton coaches={coaches} editing={c} label="Edit" subtle />
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
