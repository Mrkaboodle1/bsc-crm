'use client'

// BSC roll-call table — laid out like Rhett's Excel rolls (Term 2 2026)
// but with BSC brand colours and tappable cells on iPad. Each week cell
// cycles status on tap: blank → present → late → absent → blank.

import { useState, useTransition } from 'react'

export type WeekStatus = 'present' | 'late' | 'absent' | 'makeup' | 'excused' | null

export type RosterRow = {
  rowNumber: number
  enrolmentId: string
  studentId: string
  firstName: string
  lastName: string | null
  dob: string | null
  age: number | null
  medical: string | null
  starTier: number
  totalStars: number
  familyId: string | null
  familyName: string | null
  primaryParent: string | null
  parentEmail: string | null
  parentPhone: string | null
  weeklyFee: number
  paymentStatus: 'subscribed' | 'play_on' | 'ndis' | 'casual' | 'free_trial' | 'not_paying' | 'unknown'
  commitment: string
  payStyle: 'DD' | 'Cash' | 'Voucher' | 'NDIS' | '—'
  startDate: string
  weeks: Array<{ date: string; status: WeekStatus; attendanceId: string | null }>
  totalAttended: number
}

export type MarkFn = (input: {
  classId: string
  date: string
  studentId: string
  enrolmentId: string
  status: WeekStatus
}) => Promise<{ ok: true; attendanceId: string | null } | { ok: false; error: string }>

export type RemoveFn = (input: { enrolmentId: string; classId: string }) => Promise<{ ok: true } | { ok: false; error: string }>
export type SearchFn = (input: { classId: string; query: string }) => Promise<
  { ok: true; results: Array<{ studentId: string; firstName: string; lastName: string | null; familyName: string; primaryParent: string | null }> }
  | { ok: false; error: string }
>
export type AddFn = (input: { studentId: string; classId: string }) => Promise<{ ok: true } | { ok: false; error: string }>

const STATUS_CYCLE: WeekStatus[] = [null, 'present', 'late', 'absent']

const STATUS_STYLE: Record<string, { bg: string; text: string; emoji: string; label: string }> = {
  null:    { bg: 'bg-white hover:bg-amber-50',         text: 'text-zinc-300',   emoji: '·',  label: 'Not marked' },
  present: { bg: 'bg-emerald-500',                      text: 'text-white',      emoji: '✓',  label: 'Here' },
  late:    { bg: 'bg-amber-400',                        text: 'text-white',      emoji: '⏰', label: 'Late' },
  absent:  { bg: 'bg-red-500',                          text: 'text-white',      emoji: '✕',  label: 'Absent' },
  makeup:  { bg: 'bg-blue-500',                         text: 'text-white',      emoji: '🔁', label: 'Makeup' },
  excused: { bg: 'bg-zinc-400',                         text: 'text-white',      emoji: '🛌', label: 'Excused' },
}

const COMMITMENT_PALETTE: Record<string, string> = {
  casual:     'bg-orange-200 text-orange-900',
  ft:         'bg-emerald-200 text-emerald-900',
  'ft - sub': 'bg-pink-200 text-pink-900',
  'ft-sub':   'bg-pink-200 text-pink-900',
  sub:        'bg-pink-200 text-pink-900',
  ndis:       'bg-purple-200 text-purple-900',
  'play on':  'bg-violet-200 text-violet-900',
  playon:     'bg-violet-200 text-violet-900',
  'free trial':'bg-amber-200 text-amber-900',
}

function commitmentClass(commit: string): string {
  const key = commit.toLowerCase().trim()
  for (const [pattern, cls] of Object.entries(COMMITMENT_PALETTE)) {
    if (key.includes(pattern)) return cls
  }
  return 'bg-zinc-100 text-zinc-600'
}

function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00+10:00')
  return `${d.getDate()}.${d.getMonth() + 1}`
}

const PAYMENT_STYLE: Record<RosterRow['paymentStatus'], { label: string; cls: string; icon: string }> = {
  subscribed: { label: 'Subscribed', cls: 'bg-emerald-100 text-emerald-900', icon: '💚' },
  play_on:    { label: 'Play On voucher', cls: 'bg-violet-100 text-violet-900', icon: '🎟' },
  ndis:       { label: 'NDIS', cls: 'bg-purple-100 text-purple-900', icon: '💜' },
  casual:     { label: 'Casual', cls: 'bg-blue-100 text-blue-900', icon: '🎒' },
  free_trial: { label: 'Free trial', cls: 'bg-amber-100 text-amber-900', icon: '🆓' },
  not_paying: { label: 'Not paying', cls: 'bg-red-100 text-red-900', icon: '⚠️' },
  unknown:    { label: 'Unknown', cls: 'bg-zinc-100 text-zinc-700', icon: '❓' },
}

export function AttendanceTable({
  classId,
  roster: initialRoster,
  weekDates,
  termLabel,
  onMark,
  onRemove,
  onSearch,
  onAdd,
}: {
  classId: string
  roster: RosterRow[]
  weekDates: string[]
  termLabel: string
  onMark: MarkFn
  onRemove: RemoveFn
  onSearch: SearchFn
  onAdd: AddFn
}) {
  const [roster, setRoster] = useState(initialRoster)
  const [detailRow, setDetailRow] = useState<RosterRow | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [, startTransition] = useTransition()
  const [busyKey, setBusyKey] = useState<string | null>(null)

  function cycleCell(row: RosterRow, weekIdx: number) {
    const current = row.weeks[weekIdx]!.status
    const next = STATUS_CYCLE[(STATUS_CYCLE.findIndex((s) => s === current) + 1) % STATUS_CYCLE.length]
    const date = row.weeks[weekIdx]!.date
    const key = `${row.studentId}::${date}`

    // Optimistic update
    setRoster((rs) =>
      rs.map((r) => {
        if (r.studentId !== row.studentId) return r
        const newWeeks = r.weeks.map((w, i) => (i === weekIdx ? { ...w, status: next } : w))
        const totalAttended = newWeeks.filter((w) => w.status === 'present' || w.status === 'late' || w.status === 'makeup').length
        return { ...r, weeks: newWeeks, totalAttended }
      })
    )
    setBusyKey(key)
    startTransition(async () => {
      const result = await onMark({
        classId,
        date,
        studentId: row.studentId,
        enrolmentId: row.enrolmentId,
        status: next,
      })
      if (!result.ok) {
        // Revert
        setRoster((rs) =>
          rs.map((r) => {
            if (r.studentId !== row.studentId) return r
            const newWeeks = r.weeks.map((w, i) => (i === weekIdx ? { ...w, status: current } : w))
            const totalAttended = newWeeks.filter((w) => w.status === 'present' || w.status === 'late' || w.status === 'makeup').length
            return { ...r, weeks: newWeeks, totalAttended }
          })
        )
        alert(`Couldn't save: ${result.error}`)
      } else if (result.attendanceId) {
        setRoster((rs) =>
          rs.map((r) => {
            if (r.studentId !== row.studentId) return r
            const newWeeks = r.weeks.map((w, i) => (i === weekIdx ? { ...w, attendanceId: result.attendanceId } : w))
            return { ...r, weeks: newWeeks }
          })
        )
      }
      setBusyKey(null)
    })
  }

  // Mark all here today: find today's column and tap every blank cell
  const today = new Date().toISOString().slice(0, 10)
  const todayWeekIdx = weekDates.findIndex((d) => d === today)
  function markAllHereToday() {
    if (todayWeekIdx < 0) return
    for (const r of roster) {
      if (r.weeks[todayWeekIdx]!.status === null) cycleCell(r, todayWeekIdx)
    }
  }

  return (
    <div className="space-y-4">
      {/* Banner — Excel-style header */}
      <div className="rounded-2xl overflow-hidden shadow-md border-4 border-[#D72027]">
        <div className="bg-gradient-to-r from-[#FFC107] via-amber-300 to-[#FFC107] py-3 px-5 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-2xl font-extrabold text-zinc-900 drop-shadow-sm">
            🎪 {termLabel} · Weekly Roll Call
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddOpen(true)}
              className="bg-white border-2 border-[#D72027] text-[#D72027] font-extrabold text-sm px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              ➕ Add student
            </button>
            {todayWeekIdx >= 0 && (
              <button
                onClick={markAllHereToday}
                className="bg-emerald-600 text-white font-extrabold text-sm px-3 py-1.5 rounded-lg hover:bg-emerald-700 shadow-md"
              >
                ✅ Mark all here today
              </button>
            )}
          </div>
        </div>

        {roster.length === 0 ? (
          <div className="bg-white p-10 text-center">
            <div className="text-5xl mb-3">🪑</div>
            <p className="font-bold text-zinc-700">No students enrolled.</p>
            <p className="text-sm mt-1 text-zinc-500">Tap <strong>Add student</strong> above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white">
            <table className="text-xs sm:text-sm w-full">
              <thead>
                <tr className="bg-gradient-to-b from-amber-100 to-amber-50">
                  <th className="sticky left-0 z-10 bg-amber-100 text-left font-extrabold uppercase tracking-wider text-zinc-700 px-2 py-2 border-r-2 border-amber-200">No.</th>
                  <th className="text-left font-extrabold uppercase tracking-wider text-zinc-700 px-2 py-2">Started</th>
                  <th className="text-left font-extrabold uppercase tracking-wider text-zinc-700 px-2 py-2">Commitment</th>
                  <th className="sticky left-12 z-10 bg-amber-100 text-left font-extrabold uppercase tracking-wider text-zinc-700 px-3 py-2 border-r-2 border-amber-200">Student (Age)</th>
                  {weekDates.map((d, i) => {
                    const isToday = d === today
                    return (
                      <th
                        key={d}
                        className={`text-center font-extrabold text-[10px] px-1 py-2 ${
                          isToday ? 'bg-[#D72027] text-white' : 'text-zinc-700'
                        }`}
                      >
                        <div className="leading-tight">W{i + 1}</div>
                        <div className={`text-[9px] mt-0.5 ${isToday ? 'text-amber-100' : 'text-zinc-500'}`}>
                          {shortDate(d)}
                        </div>
                      </th>
                    )
                  })}
                  <th className="text-center font-extrabold uppercase tracking-wider text-zinc-700 px-2 py-2 bg-amber-200">✓</th>
                  <th className="text-center font-extrabold uppercase tracking-wider text-zinc-700 px-2 py-2">Pay</th>
                  <th className="text-left font-extrabold uppercase tracking-wider text-zinc-700 px-2 py-2 min-w-[160px]">CareGiver</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {roster.map((row) => {
                  const commitCls = commitmentClass(row.commitment)
                  return (
                    <tr key={row.enrolmentId} className="border-t border-zinc-100 hover:bg-amber-50/30">
                      <td className="sticky left-0 bg-white px-2 py-2 text-zinc-500 font-bold text-center border-r-2 border-amber-100">{row.rowNumber}</td>
                      <td className="px-2 py-2 text-zinc-500 whitespace-nowrap">{row.startDate ? row.startDate.slice(2).replace(/-/g, '.') : ''}</td>
                      <td className="px-2 py-2">
                        {row.commitment ? (
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap ${commitCls}`}>
                            {row.commitment.slice(0, 14)}
                          </span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="sticky left-12 bg-white px-3 py-2 border-r-2 border-amber-100 min-w-[180px]">
                        <div className="flex items-center gap-2">
                          {row.medical && (
                            <span className="inline-block bg-red-100 text-red-700 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-extrabold shrink-0" title={row.medical}>⚕</span>
                          )}
                          <div className="min-w-0">
                            <div className="font-extrabold text-zinc-900">
                              {row.firstName} {row.lastName ?? ''}
                              {row.age !== null && <span className="ml-1 text-zinc-500 font-normal">({row.age})</span>}
                            </div>
                            {row.starTier > 0 && (
                              <div className="text-[10px] text-amber-600">{'⭐'.repeat(Math.max(1, row.starTier))}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      {row.weeks.map((w, idx) => {
                        const style = STATUS_STYLE[w.status ?? 'null']!
                        const isToday = w.date === today
                        const busy = busyKey === `${row.studentId}::${w.date}`
                        return (
                          <td key={w.date} className="p-0.5 text-center">
                            <button
                              type="button"
                              onClick={() => cycleCell(row, idx)}
                              className={`w-full h-9 sm:h-10 rounded font-extrabold ${style.bg} ${style.text} ${
                                isToday && !w.status ? 'ring-2 ring-[#D72027]/40' : ''
                              } ${busy ? 'opacity-50' : ''} transition-colors active:scale-95`}
                              title={`${shortDate(w.date)} · ${style.label}`}
                            >
                              {style.emoji}
                            </button>
                          </td>
                        )
                      })}
                      <td className="px-2 py-2 text-center font-extrabold text-zinc-800 bg-amber-50">
                        {row.totalAttended}/{row.weeks.length}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                          {row.payStyle}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="text-zinc-800 font-bold leading-tight truncate max-w-[180px]">
                          {row.primaryParent ?? row.familyName ?? '—'}
                        </div>
                        {row.parentPhone && <div className="text-[10px] text-zinc-500 truncate">{row.parentPhone}</div>}
                        {row.parentEmail && <div className="text-[10px] text-zinc-500 truncate">{row.parentEmail}</div>}
                      </td>
                      <td className="px-1 py-2">
                        <button
                          type="button"
                          onClick={() => setDetailRow(row)}
                          className="w-7 h-7 rounded-full bg-white border-2 border-zinc-200 flex items-center justify-center text-xs font-extrabold hover:border-[#D72027] hover:text-[#D72027]"
                          title="Open student detail / remove"
                        >
                          ℹ
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-zinc-400 text-center">
        Tap any week cell to cycle: blank → ✓ here → ⏰ late → ✕ absent. Tap ℹ for parent / payment / remove.
      </div>

      {detailRow && (
        <DetailModal
          row={detailRow}
          classId={classId}
          onRemove={onRemove}
          onClose={() => setDetailRow(null)}
          onRemoved={() => {
            setRoster((rs) => rs.filter((r) => r.studentId !== detailRow.studentId))
            setDetailRow(null)
          }}
        />
      )}

      {addOpen && (
        <AddModal
          classId={classId}
          onSearch={onSearch}
          onAdd={onAdd}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  )
}

function DetailModal({
  row,
  classId,
  onRemove,
  onClose,
  onRemoved,
}: {
  row: RosterRow
  classId: string
  onRemove: RemoveFn
  onClose: () => void
  onRemoved: () => void
}) {
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bday = row.dob ? new Date(row.dob).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' }) : null
  const ps = PAYMENT_STYLE[row.paymentStatus]
  async function handleRemove() {
    if (!confirm(`Remove ${row.firstName} from this class? The student stays in the CRM — just unenrolled here.`)) return
    setRemoving(true)
    const result = await onRemove({ enrolmentId: row.enrolmentId, classId })
    if (!result.ok) { setError(result.error); setRemoving(false); return }
    onRemoved()
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <span className="w-14 h-14 rounded-full bg-gradient-to-br from-[#D72027] to-[#FFC107] text-white flex items-center justify-center text-lg font-extrabold shrink-0">
            {row.firstName[0]}{row.lastName?.[0] ?? ''}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-xl font-extrabold text-zinc-900">{row.firstName} {row.lastName ?? ''}</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {row.age !== null ? `${row.age}y` : 'age unknown'}
              {bday && ` · birthday ${bday}`}
            </div>
          </div>
        </div>
        <dl className="space-y-2 text-sm border-t border-zinc-200 pt-3">
          <Row label="Parent" value={row.primaryParent ?? '—'} />
          <Row label="Family" value={row.familyName ?? '—'} />
          <Row label="Email" value={row.parentEmail ?? '—'} />
          <Row label="Phone" value={row.parentPhone ?? '—'} />
          <Row label="Started" value={row.startDate ?? '—'} />
        </dl>
        <div className="mt-4 border-t border-zinc-200 pt-3">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500 mb-2">Payment</div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold ${ps.cls}`}>
            <span>{ps.icon}</span>
            <span>{ps.label}</span>
            {row.weeklyFee > 0 && <span className="opacity-70">· ${row.weeklyFee}/wk</span>}
          </div>
          {row.commitment && (
            <div className="text-xs text-zinc-500 mt-2">
              Roll says: <span className="font-bold text-zinc-700">{row.commitment}</span>
            </div>
          )}
        </div>
        {row.medical && (
          <div className="mt-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl px-4 py-3 text-sm">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-red-700 mb-1">⚕ Medical note</div>
            <div className="text-red-900">{row.medical}</div>
          </div>
        )}
        {error && <div className="mt-3 text-sm text-red-700 bg-red-50 px-3 py-2 rounded">{error}</div>}
        <div className="mt-5 flex items-center justify-between gap-2 border-t border-zinc-200 pt-4">
          {row.familyId && (
            <a href={`/families/${row.familyId}`} className="text-xs font-bold text-[#D72027] hover:underline">
              Open family page →
            </a>
          )}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="text-sm font-bold text-zinc-600 px-3 py-2 rounded-lg hover:bg-zinc-100">
              Close
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="bg-red-600 text-white text-sm font-extrabold px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {removing ? 'Removing…' : '✖ Remove from class'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 shrink-0">{label}</dt>
      <dd className="text-zinc-900 text-right text-sm font-bold truncate">{value}</dd>
    </div>
  )
}

function AddModal({
  classId,
  onSearch,
  onAdd,
  onClose,
}: {
  classId: string
  onSearch: SearchFn
  onAdd: AddFn
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<{ studentId: string; firstName: string; lastName: string | null; familyName: string; primaryParent: string | null }>>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  async function doSearch(q: string) {
    setQuery(q)
    if (q.trim().length < 2) { setResults([]); return }
    setSearching(true)
    const result = await onSearch({ classId, query: q })
    setSearching(false)
    if (result.ok) setResults(result.results)
    else setError(result.error)
  }
  async function doAdd(studentId: string) {
    setAdding(studentId)
    const result = await onAdd({ studentId, classId })
    setAdding(null)
    if (!result.ok) { setError(result.error); return }
    window.location.reload()
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4">
          <div className="text-xl font-extrabold text-zinc-900">Add a student to this class</div>
          <div className="text-xs text-zinc-500 mt-1">Search by first or last name. Already-enrolled students are hidden.</div>
        </div>
        <input
          type="search"
          autoFocus
          placeholder="Type a student name…"
          value={query}
          onChange={(e) => doSearch(e.target.value)}
          className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none"
        />
        {error && <div className="mt-3 text-sm text-red-700 bg-red-50 px-3 py-2 rounded">{error}</div>}
        <ul className="mt-4 max-h-72 overflow-y-auto divide-y divide-zinc-100 border border-zinc-200 rounded-xl">
          {searching && <li className="px-3 py-2 text-xs text-zinc-400 italic">Searching…</li>}
          {!searching && query.length >= 2 && results.length === 0 && (
            <li className="px-3 py-2 text-xs text-zinc-400 italic">No matches.</li>
          )}
          {results.map((r) => (
            <li key={r.studentId} className="flex items-center gap-3 px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-zinc-900 truncate">{r.firstName} {r.lastName ?? ''}</div>
                <div className="text-[10px] text-zinc-500 truncate">{r.familyName}{r.primaryParent ? ` · ${r.primaryParent}` : ''}</div>
              </div>
              <button
                type="button"
                onClick={() => doAdd(r.studentId)}
                disabled={adding === r.studentId}
                className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white text-xs font-extrabold px-3 py-2 rounded-lg disabled:opacity-50"
              >
                {adding === r.studentId ? 'Adding…' : '+ Add'}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="text-sm font-bold text-zinc-600 px-3 py-2 rounded-lg hover:bg-zinc-100">Close</button>
        </div>
      </div>
    </div>
  )
}
