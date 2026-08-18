'use client'

// BSC roll-call table — laid out like Rhett's Excel rolls (Term 2 2026)
// but with BSC brand colours and tappable cells on iPad. Each week cell
// cycles status on tap: blank → present → late → absent → blank.

import { useState, useTransition } from 'react'
import { BodyMap, withBody } from '@/components/body-map'

export type WeekStatus = 'present' | 'late' | 'absent' | 'makeup' | 'excused' | null

export type RosterRow = {
  rowNumber: number
  enrolmentId: string
  studentId: string
  firstName: string
  lastName: string | null
  dob: string | null
  age: number | null
  birthdayInTerm: { label: string; soon: boolean } | null
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
  payStyle: 'DD' | 'Cash' | 'Voucher' | 'NDIS' | 'EFTPOS' | 'Bank' | 'Trial' | '—'
  explicitPay: string | null
  blocked: boolean
  startDate: string
  weeks: Array<{ date: string; status: WeekStatus; attendanceId: string | null }>
  totalAttended: number
  todayNote: string | null
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
export type CreateFn = (input: { firstName: string; lastName?: string; dob?: string; parentName?: string; parentPhone?: string; parentEmail?: string; tag?: string; classId: string }) => Promise<{ ok: true } | { ok: false; error: string }>
export type MoveFn = (input: { enrolmentIds: string[]; toClassId: string; fromClassId: string }) => Promise<{ ok: true } | { ok: false; error: string }>
export type SaveNoteFn = (input: { classId: string; studentId: string; enrolmentId: string; date: string; note: string }) => Promise<{ ok: true } | { ok: false; error: string }>
export type AwardFn = (input: { classId: string; studentId: string; stars: number; reason: string; notes: string | null }) => Promise<{ ok: true; newTotal: number; newTier: number } | { ok: false; error: string }>
export type SetPaymentFn = (input: { classId: string; familyId: string; method: 'subscription' | 'voucher' | 'ndis' | 'eftpos' | 'cash' | 'bank' | 'trial' | 'none' | null }) => Promise<{ ok: true } | { ok: false; error: string }>
export type SetBlockedFn = (input: { classId: string; enrolmentId: string; blocked: boolean }) => Promise<{ ok: true } | { ok: false; error: string }>

// Admin's Pay dropdown — value stored as a pay:<method> tag on the family.
const PAY_OPTIONS: Array<{ value: string; label: string; style: RosterRow['payStyle'] }> = [
  { value: 'subscription', label: 'Subscription (DD)', style: 'DD' },
  { value: 'voucher',      label: 'Play On voucher',   style: 'Voucher' },
  { value: 'ndis',         label: 'NDIS',              style: 'NDIS' },
  { value: 'eftpos',       label: 'EFTPOS',            style: 'EFTPOS' },
  { value: 'cash',         label: 'Cash',              style: 'Cash' },
  { value: 'bank',         label: 'Bank transfer',     style: 'Bank' },
  { value: 'trial',        label: 'Free trial',        style: 'Trial' },
  { value: 'none',         label: 'Not paying',        style: '—' },
]

const STATUS_CYCLE: WeekStatus[] = [null, 'present', 'late', 'absent']

const STATUS_STYLE: Record<string, { bg: string; text: string; emoji: string; label: string }> = {
  null:    { bg: 'bg-white hover:bg-amber-50',         text: 'text-zinc-300',   emoji: '·',  label: 'Not marked' },
  present: { bg: 'bg-emerald-500',                      text: 'text-white',      emoji: '✓',  label: 'Here' },
  late:    { bg: 'bg-amber-400',                        text: 'text-white',      emoji: '⏰', label: 'Late' },
  absent:  { bg: 'bg-red-500',                          text: 'text-white',      emoji: '✕',  label: 'Absent' },
  makeup:  { bg: 'bg-blue-500',                         text: 'text-white',      emoji: '🔁', label: 'Makeup' },
  excused: { bg: 'bg-zinc-400',                         text: 'text-white',      emoji: '🛌', label: 'Excused' },
}

function shortDate(iso: string): string {
  // Parse the ISO date parts directly (no Date object / no timezone maths) so
  // the server and the browser always produce the IDENTICAL string. Using
  // new Date(...).getDate() here caused a server/client mismatch (the server
  // runs in UTC, the studio in AEST) → React hydration warning #418.
  const [, m, d] = iso.split('-')
  return `${parseInt(d ?? '0', 10)}.${parseInt(m ?? '0', 10)}`
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
  todayDate,
  onMark,
  onRemove,
  onSearch,
  onAdd,
  onCreate,
  onMove,
  onSaveNote,
  onAward,
  className,
  classes = [],
  isAdmin = false,
  onSetPayment,
  onSetBlocked,
}: {
  classId: string
  roster: RosterRow[]
  weekDates: string[]
  termLabel: string
  todayDate: string
  onMark: MarkFn
  onRemove: RemoveFn
  onSearch: SearchFn
  onAdd: AddFn
  onCreate?: CreateFn
  onMove?: MoveFn
  onSaveNote: SaveNoteFn
  onAward?: AwardFn
  className?: string
  classes?: Array<{ id: string; name: string; dayLabel: string }>
  isAdmin?: boolean
  onSetPayment?: SetPaymentFn
  onSetBlocked?: SetBlockedFn
}) {
  const [roster, setRoster] = useState(initialRoster)
  const [detailRow, setDetailRow] = useState<RosterRow | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [starRow, setStarRow] = useState<RosterRow | null>(null)
  const [incidentOpen, setIncidentOpen] = useState(false)
  const [, startTransition] = useTransition()
  const [busyKey, setBusyKey] = useState<string | null>(null)

  // Multi-select: pick several kids, then move them to another class or take them
  // off this roll in one go. Coaches share this same table, so it works in both portals.
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [moveTo, setMoveTo] = useState('')
  const selectedRows = roster.filter((r) => selected.has(r.enrolmentId))

  // Admin records how a family pays, straight from the roll. Optimistic update,
  // rolled back if the save fails. Applies to every row in the same family.
  async function handleSetPay(row: RosterRow, value: string) {
    if (!onSetPayment || !row.familyId) return
    const method = (value || null) as Parameters<SetPaymentFn>[0]['method']
    const opt = PAY_OPTIONS.find((o) => o.value === value)
    const prevRows = roster
    setRoster((rs) => rs.map((r) => r.familyId === row.familyId
      ? { ...r, explicitPay: method, payStyle: opt ? opt.style : r.payStyle }
      : r))
    const res = await onSetPayment({ classId, familyId: row.familyId, method })
    if (!res.ok) {
      setRoster(prevRows)
      alert(`Couldn't save payment method: ${res.error}`)
    }
  }

  function toggleOne(enrolmentId: string) {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(enrolmentId)) n.delete(enrolmentId)
      else n.add(enrolmentId)
      return n
    })
  }
  function toggleAll() {
    setSelected((s) => (s.size === roster.length ? new Set() : new Set(roster.map((r) => r.enrolmentId))))
  }
  function exitSelect() {
    setSelectMode(false)
    setSelected(new Set())
    setMoveTo('')
  }

  async function doBulkRemove() {
    if (selectedRows.length === 0) return
    if (!confirm(`Take ${selectedRows.length} student${selectedRows.length > 1 ? 's' : ''} off this roll? They stay in the CRM — just unenrolled from this class.`)) return
    setBulkBusy(true)
    const done: string[] = []
    for (const r of selectedRows) {
      const res = await onRemove({ enrolmentId: r.enrolmentId, classId })
      if (res.ok) done.push(r.studentId)
    }
    setRoster((rs) => rs.filter((r) => !done.includes(r.studentId)))
    setBulkBusy(false)
    exitSelect()
  }

  async function doBulkMove() {
    if (!onMove || !moveTo || selectedRows.length === 0) return
    const target = classes.find((c) => c.id === moveTo)
    if (!confirm(`Move ${selectedRows.length} student${selectedRows.length > 1 ? 's' : ''} to ${target?.name ?? 'the selected class'}?`)) return
    setBulkBusy(true)
    const enrolmentIds = selectedRows.map((r) => r.enrolmentId)
    const res = await onMove({ enrolmentIds, toClassId: moveTo, fromClassId: classId })
    setBulkBusy(false)
    if (!res.ok) { alert(`Couldn't move: ${res.error}`); return }
    setRoster((rs) => rs.filter((r) => !selected.has(r.enrolmentId)))
    exitSelect()
  }

  // Admin blocks / unblocks a finishing family. Optimistic, rolled back on failure.
  async function handleSetBlocked(row: RosterRow, blocked: boolean) {
    if (!onSetBlocked) return
    const prev = roster
    setRoster((rs) => rs.map((r) => r.enrolmentId === row.enrolmentId ? { ...r, blocked } : r))
    setDetailRow((d) => d && d.enrolmentId === row.enrolmentId ? { ...d, blocked } : d)
    const res = await onSetBlocked({ classId, enrolmentId: row.enrolmentId, blocked })
    if (!res.ok) {
      setRoster(prev)
      alert(`Couldn't ${blocked ? 'block' : 'unblock'}: ${res.error}`)
    }
  }

  function cycleCell(row: RosterRow, weekIdx: number) {
    // Blocked students can only be marked by admin — coaches see ⛔ and can't tap.
    if (row.blocked && !isAdmin) return
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
            {roster.length > 0 && (
              <button
                onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
                className={`font-extrabold text-sm px-3 py-1.5 rounded-lg border-2 ${selectMode ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50'}`}
              >
                {selectMode ? '✕ Cancel select' : '☑ Select'}
              </button>
            )}
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
                  <th className="sticky left-0 z-10 bg-amber-100 text-center font-extrabold uppercase tracking-wider text-zinc-700 px-2 py-2 border-r-2 border-amber-200">
                    {selectMode ? (
                      <input
                        type="checkbox"
                        checked={selected.size === roster.length && roster.length > 0}
                        onChange={toggleAll}
                        className="w-4 h-4 accent-[#D72027] cursor-pointer"
                        title="Select all"
                      />
                    ) : (
                      'No.'
                    )}
                  </th>
                  <th className="text-left font-extrabold uppercase tracking-wider text-zinc-700 px-2 py-2">Started</th>
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
                  {isAdmin && <th className="text-center font-extrabold uppercase tracking-wider text-zinc-700 px-2 py-2">Pay</th>}
                  <th className="text-left font-extrabold uppercase tracking-wider text-zinc-700 px-2 py-2 min-w-[160px]">CareGiver</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {roster.map((row) => {
                  return (
                    <tr key={row.enrolmentId} className={`border-t border-zinc-100 ${row.blocked ? 'opacity-50 bg-zinc-50' : ''} ${selected.has(row.enrolmentId) ? 'bg-red-50' : row.blocked ? '' : 'hover:bg-amber-50/30'}`}>
                      <td className={`sticky left-0 px-2 py-2 text-zinc-500 font-bold text-center border-r-2 border-amber-100 ${selected.has(row.enrolmentId) ? 'bg-red-50' : 'bg-white'}`}>
                        {selectMode ? (
                          <input
                            type="checkbox"
                            checked={selected.has(row.enrolmentId)}
                            onChange={() => toggleOne(row.enrolmentId)}
                            className="w-4 h-4 accent-[#D72027] cursor-pointer"
                          />
                        ) : (
                          row.rowNumber
                        )}
                      </td>
                      <td className="px-2 py-2 text-zinc-500 whitespace-nowrap">{row.startDate ? row.startDate.slice(2).replace(/-/g, '.') : ''}</td>
                      <td className="sticky left-12 bg-white px-3 py-2 border-r-2 border-amber-100 min-w-[180px]">
                        <div className="flex items-center gap-2">
                          {row.medical && (
                            <span className="inline-block bg-red-100 text-red-700 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-extrabold shrink-0" title={row.medical}>⚕</span>
                          )}
                          <div className="min-w-0">
                            <div className="font-extrabold text-zinc-900">
                              {row.firstName} {row.lastName ?? ''}
                              {row.age !== null && <span className="ml-1 text-zinc-500 font-normal">({row.age})</span>}
                              {row.blocked && (
                                <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded align-middle bg-zinc-200 text-zinc-600" title="Blocked by admin — not returning. Coaches can't mark this student.">⛔ Finishing</span>
                              )}
                              {row.birthdayInTerm && (
                                <span className={`ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded align-middle ${row.birthdayInTerm.soon ? 'bg-pink-100 text-pink-700 ring-1 ring-pink-200' : 'bg-zinc-100 text-zinc-500'}`} title={`Birthday ${row.birthdayInTerm.label}${row.birthdayInTerm.soon ? ' — coming up, celebrate! 🎉' : ' (this term)'}`}>🎂 {row.birthdayInTerm.label}</span>
                              )}
                            </div>
                            {onAward && (
                              <button
                                type="button"
                                onClick={() => setStarRow(row)}
                                className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-700 active:scale-95"
                                title="Tap to add stars / record a completed card"
                              >
                                <span>{'⭐'.repeat(Math.max(1, row.starTier))}</span>
                                <span className="text-amber-600">{row.totalStars}</span>
                                <span className="text-amber-400">＋</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      {row.weeks.map((w, idx) => {
                        const style = STATUS_STYLE[w.status ?? 'null']!
                        const isToday = w.date === today
                        const busy = busyKey === `${row.studentId}::${w.date}`
                        const lockedForCoach = row.blocked && !isAdmin
                        return (
                          <td key={w.date} className="p-0.5 text-center">
                            <button
                              type="button"
                              onClick={() => cycleCell(row, idx)}
                              disabled={lockedForCoach}
                              className={`w-full h-9 sm:h-10 rounded font-extrabold ${
                                lockedForCoach && !w.status ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' : `${style.bg} ${style.text}`
                              } ${isToday && !w.status && !row.blocked ? 'ring-2 ring-[#D72027]/40' : ''} ${busy ? 'opacity-50' : ''} transition-colors ${lockedForCoach ? '' : 'active:scale-95'}`}
                              title={lockedForCoach ? 'Blocked by admin — not returning' : `${shortDate(w.date)} · ${style.label}`}
                            >
                              {lockedForCoach && !w.status ? '⛔' : style.emoji}
                            </button>
                          </td>
                        )
                      })}
                      <td className="px-2 py-2 text-center font-extrabold text-zinc-800 bg-amber-50">
                        {row.totalAttended}/{row.weeks.length}
                      </td>
                      {isAdmin && (
                        <td className="px-2 py-2 text-center">
                          <select
                            value={row.explicitPay ?? ''}
                            onChange={(e) => handleSetPay(row, e.target.value)}
                            className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200 cursor-pointer hover:border-[#D72027] focus:outline-none focus:border-[#D72027]"
                            title="How this family pays — admin only. 'Auto' means worked out from Stripe, vouchers and the roll."
                          >
                            <option value="">Auto: {row.payStyle}</option>
                            {PAY_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </td>
                      )}
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
                          className={`relative w-7 h-7 rounded-full bg-white border-2 flex items-center justify-center text-xs font-extrabold hover:border-[#D72027] hover:text-[#D72027] ${row.todayNote ? 'border-amber-400 text-amber-600' : 'border-zinc-200'}`}
                          title={row.todayNote ? `Note: ${row.todayNote}` : 'Open student detail / note / remove'}
                        >
                          {row.todayNote ? '📝' : 'ℹ'}
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
        Tap any week cell to cycle: blank → ✓ here → ⏰ late → ✕ absent. ⛔ grey = blocked by admin, not returning{isAdmin ? ' (block via ℹ)' : " — you can't mark them"}. Tap the ⭐ to add stars. Tap ℹ for {isAdmin ? 'parent / payment / block / remove' : 'parent details and notes'}.
      </div>

      {/* Big red — log an incident for THIS class in one place */}
      <button
        type="button"
        onClick={() => setIncidentOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-b from-red-600 to-red-700 text-white font-extrabold text-base py-3.5 rounded-2xl shadow-md hover:from-red-700 hover:to-red-800 active:scale-[0.99] border-2 border-red-800"
      >
        🚨 Log an incident / accident report
      </button>

      {detailRow && (
        <DetailModal
          row={detailRow}
          classId={classId}
          todayDate={todayDate}
          isAdmin={isAdmin}
          onToggleBlocked={isAdmin && onSetBlocked ? (blocked: boolean) => handleSetBlocked(detailRow, blocked) : undefined}
          onRemove={onRemove}
          onSaveNote={onSaveNote}
          onNoteSaved={(note) => {
            setRoster((rs) => rs.map((r) => r.studentId === detailRow.studentId ? { ...r, todayNote: note } : r))
            setDetailRow((d) => d ? { ...d, todayNote: note } : d)
          }}
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
          onCreate={onCreate}
          onClose={() => setAddOpen(false)}
        />
      )}

      {starRow && onAward && (
        <StarModal
          row={starRow}
          classId={classId}
          onAward={onAward}
          onClose={() => setStarRow(null)}
          onAwarded={(newTotal, newTier) => {
            setRoster((rs) => rs.map((r) => r.studentId === starRow.studentId ? { ...r, totalStars: newTotal, starTier: newTier } : r))
            setStarRow(null)
          }}
        />
      )}

      {incidentOpen && (
        <IncidentModal
          className={className ?? termLabel}
          roster={roster}
          preselected={selectedRows}
          onClose={() => setIncidentOpen(false)}
        />
      )}

      {/* Floating bulk-action bar — appears when kids are ticked */}
      {selectMode && selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-4 pointer-events-none">
          <div className="pointer-events-auto bg-zinc-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 flex-wrap max-w-3xl w-full sm:w-auto">
            <span className="font-extrabold text-sm whitespace-nowrap">
              {selected.size} selected
            </span>
            {onMove && classes.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={moveTo}
                  onChange={(e) => setMoveTo(e.target.value)}
                  className="bg-zinc-800 text-white text-sm font-bold rounded-lg px-2 py-2 border border-zinc-600 focus:outline-none max-w-[200px]"
                >
                  <option value="">Move to…</option>
                  {classes.filter((c) => c.id !== classId).map((c) => (
                    <option key={c.id} value={c.id}>{c.dayLabel} · {c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={doBulkMove}
                  disabled={bulkBusy || !moveTo}
                  className="bg-blue-600 text-white text-sm font-extrabold px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-40 whitespace-nowrap"
                >
                  {bulkBusy ? 'Working…' : '→ Move'}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={doBulkRemove}
              disabled={bulkBusy}
              className="bg-red-600 text-white text-sm font-extrabold px-3 py-2 rounded-lg hover:bg-red-700 disabled:opacity-40 whitespace-nowrap"
            >
              {bulkBusy ? 'Working…' : '✖ Remove from roll'}
            </button>
            <button
              type="button"
              onClick={exitSelect}
              className="text-zinc-300 text-sm font-bold px-2 py-2 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailModal({
  row,
  classId,
  todayDate,
  isAdmin = false,
  onToggleBlocked,
  onRemove,
  onSaveNote,
  onNoteSaved,
  onClose,
  onRemoved,
}: {
  row: RosterRow
  classId: string
  todayDate: string
  isAdmin?: boolean
  onToggleBlocked?: (blocked: boolean) => void
  onRemove: RemoveFn
  onSaveNote: SaveNoteFn
  onNoteSaved: (note: string | null) => void
  onClose: () => void
  onRemoved: () => void
}) {
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState(row.todayNote ?? '')
  const [noteBusy, setNoteBusy] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)
  const bday = row.dob ? new Date(row.dob).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' }) : null
  const ps = PAYMENT_STYLE[row.paymentStatus]
  async function handleSaveNote() {
    setNoteBusy(true); setError(null); setNoteSaved(false)
    const res = await onSaveNote({ classId, studentId: row.studentId, enrolmentId: row.enrolmentId, date: todayDate, note })
    setNoteBusy(false)
    if (!res.ok) { setError(res.error); return }
    setNoteSaved(true)
    onNoteSaved(note.trim() || null)
    setTimeout(() => setNoteSaved(false), 1800)
  }
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
        {/* Payment + roll blocking — ADMIN ONLY. Coaches never see money on the roll. */}
        {isAdmin && (
          <div className="mt-4 border-t border-zinc-200 pt-3">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500 mb-2">Payment</div>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold ${ps.cls}`}>
              <span>{ps.icon}</span>
              <span>{ps.label}</span>
              {row.weeklyFee > 0 && <span className="opacity-70">· ${row.weeklyFee}/wk</span>}
            </div>
            {onToggleBlocked && (
              <div className="mt-3">
                {row.blocked ? (
                  <button
                    type="button"
                    onClick={() => onToggleBlocked(false)}
                    className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300 text-emerald-800 text-sm font-extrabold px-4 py-2 rounded-lg"
                  >
                    ✓ Unblock — they&apos;re staying after all
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Block ${row.firstName} on the roll?\n\nThe row stays visible but goes grey with a ⛔. Coaches can't mark them anymore — only admin can. Use this when a family has given notice and is finishing up.`)) onToggleBlocked(true)
                    }}
                    className="inline-flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 border-2 border-zinc-300 text-zinc-700 text-sm font-extrabold px-4 py-2 rounded-lg"
                  >
                    ⛔ Block on roll — family finishing up
                  </button>
                )}
                <div className="text-[10px] text-zinc-400 mt-1">Blocked students stay visible so coaches know they&apos;re not returning. Removing them entirely is separate, below.</div>
              </div>
            )}
          </div>
        )}
        {row.medical && (
          <div className="mt-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl px-4 py-3 text-sm">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-red-700 mb-1">⚕ Medical note</div>
            <div className="text-red-900">{row.medical}</div>
          </div>
        )}
        {/* Coach's note for today's session */}
        <div className="mt-4 border-t border-zinc-200 pt-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">📝 Coach note · today</div>
            {noteSaved && <span className="text-[10px] font-bold text-emerald-600">Saved ✓</span>}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. Nailed her cartwheel today · left 10 min early · needed extra help with focus"
            className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none resize-none"
          />
          <button
            type="button"
            onClick={handleSaveNote}
            disabled={noteBusy}
            className="mt-2 bg-zinc-900 text-white text-sm font-extrabold px-4 py-2 rounded-lg hover:bg-zinc-800 disabled:opacity-50"
          >
            {noteBusy ? 'Saving…' : 'Save note'}
          </button>
        </div>
        {/* Full lesson plan (esp. for private lessons) */}
        <a href={`/coach-portal/lessons?student=${row.studentId}`} className="mt-4 flex items-center justify-center gap-2 bg-violet-50 border border-violet-200 text-violet-800 font-bold text-sm py-2.5 rounded-xl hover:bg-violet-100">
          📝 Open {row.firstName}&apos;s lesson plan & progress →
        </a>
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
  onCreate,
  onClose,
}: {
  classId: string
  onSearch: SearchFn
  onAdd: AddFn
  onCreate?: CreateFn
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<{ studentId: string; firstName: string; lastName: string | null; familyName: string; primaryParent: string | null }>>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [creating, setCreating] = useState(false)
  const [nk, setNk] = useState({ firstName: '', lastName: '', parentName: '', parentPhone: '', parentEmail: '', tag: '' })
  const setNK = (k: string, v: string) => setNk((p) => ({ ...p, [k]: v }))
  async function doCreate() {
    if (!onCreate) return
    if (!nk.firstName.trim()) { setError('Enter the child’s first name'); return }
    setCreating(true); setError(null)
    const result = await onCreate({ ...nk, classId })
    setCreating(false)
    if (!result.ok) { setError(result.error); return }
    window.location.reload()
  }
  const inp = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none'
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

        {onCreate && (
          <div className="mt-4 border-t border-zinc-100 pt-3">
            {!showNew ? (
              <button onClick={() => setShowNew(true)} className="text-sm font-bold text-[#D72027] hover:underline">+ Type a brand-new kid (not in the list)</button>
            ) : (
              <div className="space-y-2.5">
                <div className="text-sm font-extrabold text-zinc-800">New child</div>
                <div className="grid grid-cols-2 gap-2">
                  <input className={inp} placeholder="Child first name *" value={nk.firstName} onChange={(e) => setNK('firstName', e.target.value)} autoFocus />
                  <input className={inp} placeholder="Child last name" value={nk.lastName} onChange={(e) => setNK('lastName', e.target.value)} />
                </div>
                <input className={inp} placeholder="Parent / caregiver name" value={nk.parentName} onChange={(e) => setNK('parentName', e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <input className={inp} placeholder="Parent mobile" value={nk.parentPhone} onChange={(e) => setNK('parentPhone', e.target.value)} />
                  <input className={inp} placeholder="Parent email" value={nk.parentEmail} onChange={(e) => setNK('parentEmail', e.target.value)} />
                </div>
                <input className={inp} placeholder="Tag — where from? (e.g. free trial, walk-in, Facebook)" value={nk.tag} onChange={(e) => setNK('tag', e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={doCreate} disabled={creating} className="bg-[#D72027] text-white text-sm font-bold px-4 py-2 rounded-lg disabled:opacity-50">{creating ? 'Adding…' : 'Add child to class'}</button>
                  <button onClick={() => setShowNew(false)} className="text-sm font-semibold text-zinc-500 px-3">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="text-sm font-bold text-zinc-600 px-3 py-2 rounded-lg hover:bg-zinc-100">Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Star award: tap a kid's ⭐ on the roll to add stars / record a completed card ──
const STAR_REASONS: Array<{ value: string; label: string }> = [
  { value: 'skill_milestone', label: '🎯 Skill / card completed' },
  { value: 'discipline', label: '🧘 Great focus & behaviour' },
  { value: 'attendance', label: '📅 Attendance' },
  { value: 'showcase', label: '⭐ Showcase / performance' },
  { value: 'other', label: '✨ Other' },
]

function StarModal({
  row, classId, onAward, onClose, onAwarded,
}: {
  row: RosterRow
  classId: string
  onAward: AwardFn
  onClose: () => void
  onAwarded: (newTotal: number, newTier: number) => void
}) {
  const [stars, setStars] = useState(1)
  const [reason, setReason] = useState('skill_milestone')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true); setError(null)
    const r = await onAward({ classId, studentId: row.studentId, stars, reason, notes: note.trim() || null })
    setBusy(false)
    if (!r.ok) { setError(r.error); return }
    onAwarded(r.newTotal, r.newTier)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="text-4xl mb-1">⭐</div>
          <div className="text-xl font-extrabold text-zinc-900">Add stars for {row.firstName}</div>
          <div className="text-xs text-zinc-500 mt-0.5">Currently {row.totalStars} stars · {'⭐'.repeat(Math.max(1, row.starTier))}</div>
        </div>

        <div className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500 mb-1.5">How many stars?</div>
        <div className="flex gap-2 flex-wrap mb-2">
          {[1, 2, 3, 5, 10].map((n) => (
            <button key={n} type="button" onClick={() => setStars(n)}
              className={`w-11 h-11 rounded-xl font-extrabold text-sm border-2 ${stars === n ? 'bg-amber-400 border-amber-500 text-zinc-900' : 'bg-white border-zinc-200 text-zinc-600 hover:border-amber-300'}`}>
              +{n}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => { setStars(10); setReason('skill_milestone'); setNote('Completed a star card 🏆') }}
          className="w-full mb-4 text-sm font-extrabold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl py-2">
          🏆 Completed a whole card (+10)
        </button>

        <div className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500 mb-1.5">What for?</div>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-3 py-2 border-2 border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none mb-3">
          {STAR_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>

        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional) — e.g. nailed her cartwheel" className="w-full px-3 py-2 border-2 border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none" />

        {error && <div className="mt-3 text-sm text-red-700 bg-red-50 px-3 py-2 rounded">{error}</div>}

        <div className="mt-5 flex gap-2">
          <button onClick={submit} disabled={busy} className="flex-1 bg-amber-500 text-zinc-900 font-extrabold text-sm py-3 rounded-xl hover:bg-amber-600 disabled:opacity-50">
            {busy ? 'Adding…' : `Give ${row.firstName} +${stars} ⭐`}
          </button>
          <button onClick={onClose} className="text-sm font-bold text-zinc-600 px-4 rounded-xl hover:bg-zinc-100">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Class incident / accident report — quick log straight from the roll ──
function IncidentModal({
  className, roster, preselected, onClose,
}: {
  className: string
  roster: RosterRow[]
  preselected: RosterRow[]
  onClose: () => void
}) {
  const [type, setType] = useState('incident')
  const [severity, setSeverity] = useState('minor')
  const [involved, setInvolved] = useState<Set<string>>(new Set(preselected.map((r) => r.studentId)))
  const [when, setWhen] = useState(() => new Date().toISOString().slice(0, 10))
  const [atTime, setAtTime] = useState('')
  const [extraKids, setExtraKids] = useState('')
  const [bodyParts, setBodyParts] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [action, setAction] = useState('')
  const [injury, setInjury] = useState('')
  const [witnesses, setWitnesses] = useState('')
  const [parentNotified, setParentNotified] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doneNo, setDoneNo] = useState<string | null>(null)

  function toggle(id: string) {
    setInvolved((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function submit() {
    if (!description.trim()) { setError('Please describe what happened'); return }
    setBusy(true); setError(null)
    const rosterKids = roster.filter((r) => involved.has(r.studentId)).map((r) => `${r.firstName} ${r.lastName ?? ''}`.trim())
    const kids = [...rosterKids, extraKids.trim()].filter(Boolean).join(', ')
    const res = await fetch('/api/incidents', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        report_type: type, severity, location: className,
        occurred_on: when, occurred_at: atTime || null,
        children: kids || null, description, action_taken: action || null,
        injury_details: withBody(bodyParts, injury), witnesses: witnesses || null,
        parent_notified: parentNotified,
      }),
    })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(j.error || 'Could not save the report'); return }
    setDoneNo(j.row?.report_no || 'saved')
  }

  const inp = 'w-full px-3 py-2 border-2 border-zinc-200 rounded-lg text-sm focus:border-red-500 focus:outline-none'

  if (doneNo) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="text-5xl mb-2">✅</div>
          <div className="text-xl font-extrabold text-zinc-900">Incident report saved</div>
          <div className="text-sm text-zinc-500 mt-1">Report <strong>{doneNo}</strong> is logged. Admin &amp; coaches can see it under Incidents.</div>
          <button onClick={onClose} className="mt-5 bg-zinc-900 text-white font-extrabold text-sm px-5 py-2.5 rounded-xl hover:bg-zinc-800">Done</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🚨</span>
          <h3 className="text-xl font-extrabold text-zinc-900">Incident / accident report</h3>
        </div>
        <div className="text-xs text-zinc-500 mb-4">Class: <strong>{className}</strong>. Saved for both admin &amp; coaches.</div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className={inp}>
              <option value="incident">Incident</option>
              <option value="accident">Accident</option>
              <option value="injury">Injury</option>
              <option value="near_miss">Near miss</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">Severity</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={inp}>
              <option value="minor">Minor</option>
              <option value="moderate">Moderate</option>
              <option value="serious">Serious</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">Date of incident</label>
            <input type="date" value={when} onChange={(e) => setWhen(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">Time of incident</label>
            <input type="time" value={atTime} onChange={(e) => setAtTime(e.target.value)} className={inp} />
          </div>
        </div>

        <label className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">Children involved (tap to add)</label>
        <div className="flex flex-wrap gap-1.5 my-2">
          {roster.map((r) => (
            <button key={r.studentId} type="button" onClick={() => toggle(r.studentId)}
              className={`text-xs font-bold px-2 py-1 rounded-full border ${involved.has(r.studentId) ? 'bg-red-600 text-white border-red-700' : 'bg-white text-zinc-600 border-zinc-200 hover:border-red-300'}`}>
              {r.firstName} {r.lastName ?? ''}
            </button>
          ))}
        </div>
        <input value={extraKids} onChange={(e) => setExtraKids(e.target.value)} className={inp + ' mb-3'} placeholder="Other children not on this roll (visitors, school groups) — type their names" />

        <label className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">What happened? *</label>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inp + ' resize-none mb-3'} placeholder="Describe the incident…" />

        <label className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">Action taken</label>
        <textarea rows={2} value={action} onChange={(e) => setAction(e.target.value)} className={inp + ' resize-none mb-3'} placeholder="First aid given, area made safe, etc." />

        <div className="mb-3">
          <label className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">Where on the body? — tap the picture</label>
          <div className="mt-1"><BodyMap value={bodyParts} onChange={setBodyParts} /></div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <input value={injury} onChange={(e) => setInjury(e.target.value)} className={inp} placeholder="Injury details (if any)" />
          <input value={witnesses} onChange={(e) => setWitnesses(e.target.value)} className={inp} placeholder="Witnesses" />
        </div>

        <label className="flex items-center gap-2 text-sm font-bold text-zinc-700 mb-3">
          <input type="checkbox" checked={parentNotified} onChange={(e) => setParentNotified(e.target.checked)} className="w-4 h-4 accent-red-600" />
          Parent notified
        </label>

        {error && <div className="mb-3 text-sm text-red-700 bg-red-50 px-3 py-2 rounded">{error}</div>}

        <div className="flex gap-2">
          <button onClick={submit} disabled={busy} className="flex-1 bg-red-600 text-white font-extrabold text-sm py-3 rounded-xl hover:bg-red-700 disabled:opacity-50">
            {busy ? 'Saving…' : '🚨 Save incident report'}
          </button>
          <button onClick={onClose} className="text-sm font-bold text-zinc-600 px-4 rounded-xl hover:bg-zinc-100">Cancel</button>
        </div>
      </div>
    </div>
  )
}
