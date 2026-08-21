'use client'

// Admin timesheet editor. Everything displays and edits in Brisbane time;
// conversion to/from UTC happens here (Brisbane is UTC+10, no DST).

import { useMemo, useState } from 'react'

export type LogRow = {
  id: string; coach_id: string; person_name: string; kind: string; source: string
  clock_in: string; clock_out: string | null
}
export type CoachOption = { id: string; full_name: string; role: string }

const BNE_OFFSET_MS = 10 * 3600 * 1000

function bne(iso: string): Date { return new Date(new Date(iso).getTime() + BNE_OFFSET_MS) }
function bneDateKey(iso: string): string { return bne(iso).toISOString().slice(0, 10) }
function bneTime(iso: string | null): string { return iso ? bne(iso).toISOString().slice(11, 16) : '' }
function toUtcIso(dateKey: string, hhmm: string): string | null {
  if (!hhmm) return null
  return new Date(new Date(`${dateKey}T${hhmm}:00.000Z`).getTime() - BNE_OFFSET_MS).toISOString()
}
function hoursBetween(a: string, b: string | null): string {
  if (!b) return 'still on'
  const mins = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (!h) return `${m} min`
  return m ? `${h} hr ${m} min` : `${h} hr`
}
function niceDay(key: string): string {
  return new Date(key + 'T12:00:00Z').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export function TimesheetsClient({ logs, coaches }: { logs: LogRow[]; coaches: CoachOption[] }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, { in: string; out: string }>>({})
  const [addCoach, setAddCoach] = useState(coaches[0]?.id ?? '')
  const [addDate, setAddDate] = useState(() => new Date(Date.now() + BNE_OFFSET_MS).toISOString().slice(0, 10))
  const [addIn, setAddIn] = useState('15:00')
  const [addOut, setAddOut] = useState('18:00')

  const byDay = useMemo(() => {
    const m = new Map<string, LogRow[]>()
    for (const l of logs) {
      const k = bneDateKey(l.clock_in)
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(l)
    }
    return [...m.entries()]
  }, [logs])

  async function post(body: Record<string, unknown>, busyKey: string) {
    setBusy(busyKey)
    try {
      const r = await fetch('/api/timesheets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json().catch(() => ({}))
      if (d?.ok === false) { alert(d.error || 'That didn’t save — try again.'); return }
      window.location.reload()
    } finally { setBusy(null) }
  }

  function save(row: LogRow) {
    const e = edits[row.id] ?? { in: bneTime(row.clock_in), out: bneTime(row.clock_out) }
    const day = bneDateKey(row.clock_in)
    post({ action: 'update', id: row.id, clockIn: toUtcIso(day, e.in), clockOut: toUtcIso(day, e.out) }, 'save' + row.id)
  }

  return (
    <div className="max-w-4xl space-y-5">
      {/* Add a forgotten shift */}
      <div className="bg-white rounded-2xl border-2 border-zinc-200 p-4 flex flex-wrap items-end gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500 mb-1">Who</div>
          <select value={addCoach} onChange={(e) => setAddCoach(e.target.value)} className="border-2 border-zinc-200 rounded-lg px-2 py-1.5 text-sm">
            {coaches.map((c) => <option key={c.id} value={c.id}>{c.full_name}{c.role === 'trainee' ? ' (trainee)' : ''}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500 mb-1">Day</div>
          <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} className="border-2 border-zinc-200 rounded-lg px-2 py-1.5 text-sm" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500 mb-1">On</div>
          <input type="time" value={addIn} onChange={(e) => setAddIn(e.target.value)} className="border-2 border-zinc-200 rounded-lg px-2 py-1.5 text-sm" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500 mb-1">Off</div>
          <input type="time" value={addOut} onChange={(e) => setAddOut(e.target.value)} className="border-2 border-zinc-200 rounded-lg px-2 py-1.5 text-sm" />
        </div>
        <button
          type="button"
          disabled={busy === 'add' || !addCoach}
          onClick={() => post({ action: 'add', coachId: addCoach, clockIn: toUtcIso(addDate, addIn), clockOut: toUtcIso(addDate, addOut) }, 'add')}
          className="bg-gradient-to-b from-[#D72027] to-[#A0151B] text-white text-sm font-extrabold px-4 py-2 rounded-xl shadow disabled:opacity-50"
        >
          {busy === 'add' ? 'Saving…' : '＋ Add shift'}
        </button>
      </div>

      {/* The last 14 days */}
      {byDay.map(([day, rows]) => (
        <div key={day} className="bg-white rounded-2xl border-2 border-zinc-200 overflow-hidden">
          <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200 font-extrabold text-sm text-zinc-700">{niceDay(day)}</div>
          <table className="w-full text-sm">
            <tbody>
              {rows.map((row) => {
                const e = edits[row.id] ?? { in: bneTime(row.clock_in), out: bneTime(row.clock_out) }
                const dirty = e.in !== bneTime(row.clock_in) || e.out !== bneTime(row.clock_out)
                return (
                  <tr key={row.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-2 font-bold text-zinc-800">{row.person_name}</td>
                    <td className="px-2 py-2">
                      <input type="time" value={e.in} onChange={(ev) => setEdits((p) => ({ ...p, [row.id]: { ...e, in: ev.target.value } }))}
                        className="border-2 border-zinc-200 rounded-lg px-2 py-1 text-sm" />
                    </td>
                    <td className="px-1 py-2 text-zinc-400">→</td>
                    <td className="px-2 py-2">
                      <input type="time" value={e.out} onChange={(ev) => setEdits((p) => ({ ...p, [row.id]: { ...e, out: ev.target.value } }))}
                        className="border-2 border-zinc-200 rounded-lg px-2 py-1 text-sm" />
                    </td>
                    <td className="px-2 py-2 text-zinc-500 whitespace-nowrap">{hoursBetween(row.clock_in, row.clock_out)}</td>
                    <td className="px-2 py-2 text-[10px] text-zinc-400">{row.source}</td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">
                      {dirty && (
                        <button type="button" onClick={() => save(row)} disabled={busy === 'save' + row.id}
                          className="bg-zinc-900 text-white text-xs font-extrabold px-3 py-1.5 rounded-lg mr-1.5 disabled:opacity-50">
                          {busy === 'save' + row.id ? '…' : 'Save'}
                        </button>
                      )}
                      <button type="button"
                        onClick={() => { if (confirm(`Delete this ${row.person_name} entry? This can’t be undone.`)) post({ action: 'delete', id: row.id }, 'del' + row.id) }}
                        disabled={busy === 'del' + row.id}
                        className="text-zinc-400 hover:text-red-600 font-bold px-2" title="Delete this entry">✕</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
      {byDay.length === 0 && <div className="text-sm text-zinc-500">No clock entries in the last 14 days.</div>}
    </div>
  )
}
