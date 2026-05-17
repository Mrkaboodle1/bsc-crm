'use client'

import { useState, useTransition } from 'react'

export type Status = 'present' | 'late' | 'absent' | 'makeup' | 'excused'

export type MarkFn = (input: {
  classId: string
  date: string
  studentId: string
  enrolmentId: string
  status: Status | null
}) => Promise<{ ok: true; attendanceId: string | null } | { ok: false; error: string }>

export type AwardFn = (input: {
  classId: string
  studentId: string
  stars: number
  reason: string
  notes: string | null
}) => Promise<{ ok: true; newTotal: number; newTier: number } | { ok: false; error: string }>

export type PaymentStatus = 'subscribed' | 'play_on' | 'ndis' | 'casual' | 'free_trial' | 'not_paying' | 'unknown'

export type RosterEntry = {
  enrolmentId: string
  studentId: string
  firstName: string
  lastName: string | null
  dob: string | null
  age: number | null
  medical: string | null
  starTier: number
  totalStars: number
  attendanceId: string | null
  status: Status | null
  starsToday: number
  // Family + payment context
  familyId: string | null
  familyName: string | null
  primaryParent: string | null
  parentEmail: string | null
  parentPhone: string | null
  weeklyFee: number
  paymentStatus: PaymentStatus
  commitment: string | null
}

export type RemoveFn = (input: { enrolmentId: string; classId: string }) => Promise<{ ok: true } | { ok: false; error: string }>
export type SearchFn = (input: { classId: string; query: string }) => Promise<
  { ok: true; results: Array<{ studentId: string; firstName: string; lastName: string | null; familyName: string; primaryParent: string | null }> }
  | { ok: false; error: string }
>
export type AddFn = (input: { studentId: string; classId: string }) => Promise<{ ok: true } | { ok: false; error: string }>

const PAYMENT_STYLE: Record<PaymentStatus, { label: string; cls: string; icon: string }> = {
  subscribed: { label: 'Subscribed', cls: 'bg-emerald-100 text-emerald-900', icon: '💚' },
  play_on:    { label: 'Play On voucher', cls: 'bg-violet-100 text-violet-900', icon: '🎟' },
  ndis:       { label: 'NDIS', cls: 'bg-purple-100 text-purple-900', icon: '💜' },
  casual:     { label: 'Casual', cls: 'bg-blue-100 text-blue-900', icon: '🎒' },
  free_trial: { label: 'Free trial', cls: 'bg-amber-100 text-amber-900', icon: '🆓' },
  not_paying: { label: 'Not paying', cls: 'bg-red-100 text-red-900', icon: '⚠️' },
  unknown:    { label: 'Unknown', cls: 'bg-zinc-100 text-zinc-700', icon: '❓' },
}

function birthdayLabel(dob: string | null): string | null {
  if (!dob) return null
  const d = new Date(dob)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })
}

const STATUS_CYCLE: (Status | null)[] = [null, 'present', 'late', 'absent']

const STATUS_STYLE: Record<string, { bg: string; ring: string; label: string; emoji: string }> = {
  null: { bg: 'bg-white', ring: 'border-zinc-200', label: 'Not marked', emoji: '·' },
  present: { bg: 'bg-emerald-50', ring: 'border-emerald-400', label: 'Here', emoji: '✅' },
  late: { bg: 'bg-amber-50', ring: 'border-amber-400', label: 'Late', emoji: '⏰' },
  absent: { bg: 'bg-red-50', ring: 'border-red-400', label: 'Absent', emoji: '❌' },
  makeup: { bg: 'bg-blue-50', ring: 'border-blue-400', label: 'Makeup', emoji: '🔁' },
  excused: { bg: 'bg-zinc-50', ring: 'border-zinc-300', label: 'Excused', emoji: '🛌' },
}

const STAR_REASONS = [
  { value: 'skill_milestone', label: '🎯 Skill milestone' },
  { value: 'discipline', label: '🧘 Discipline' },
  { value: 'attendance', label: '📅 Attendance' },
  { value: 'showcase', label: '⭐ Showcase' },
  { value: 'social_tag', label: '📣 Social tag' },
  { value: 'referral', label: '🤝 Referral' },
  { value: 'other', label: '✨ Other' },
] as const

export function AttendanceGrid({
  classId,
  date,
  roster: initialRoster,
  onMark,
  onAward,
  onRemove,
  onSearch,
  onAdd,
}: {
  classId: string
  date: string
  roster: RosterEntry[]
  onMark: MarkFn
  onAward: AwardFn
  onRemove: RemoveFn
  onSearch: SearchFn
  onAdd: AddFn
}) {
  const [roster, setRoster] = useState(initialRoster)
  const [starModal, setStarModal] = useState<RosterEntry | null>(null)
  const [detailModal, setDetailModal] = useState<RosterEntry | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [, startTransition] = useTransition()
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({})

  const total = roster.length
  const present = roster.filter((r) => r.status === 'present' || r.status === 'late').length
  const absent = roster.filter((r) => r.status === 'absent').length

  function cycleStatus(student: RosterEntry) {
    const idx = STATUS_CYCLE.findIndex((s) => s === student.status)
    const nextStatus = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
    optimisticUpdate(student.studentId, { status: nextStatus })
    persistMark(student, nextStatus)
  }

  function optimisticUpdate(studentId: string, patch: Partial<RosterEntry>) {
    setRoster((rs) => rs.map((r) => (r.studentId === studentId ? { ...r, ...patch } : r)))
  }

  function persistMark(student: RosterEntry, status: Status | null) {
    setSavingMap((m) => ({ ...m, [student.studentId]: true }))
    startTransition(async () => {
      const result = await onMark({
        classId,
        date,
        studentId: student.studentId,
        enrolmentId: student.enrolmentId,
        status,
      })
      if (!result.ok) {
        // Revert on error
        optimisticUpdate(student.studentId, { status: student.status })
        alert(`Couldn't save: ${result.error}`)
      } else if (result.attendanceId) {
        optimisticUpdate(student.studentId, { attendanceId: result.attendanceId })
      }
      setSavingMap((m) => ({ ...m, [student.studentId]: false }))
    })
  }

  function markAllPresent() {
    const unmarked = roster.filter((r) => r.status === null)
    if (unmarked.length === 0) return
    unmarked.forEach((r) => {
      optimisticUpdate(r.studentId, { status: 'present' })
      persistMark(r, 'present')
    })
  }

  return (
    <div className="space-y-6">
      {/* Counter strip */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-extrabold text-zinc-900">{present}</span>
          <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold">of {total} here</span>
        </div>
        {absent > 0 && (
          <div className="flex items-center gap-2 text-zinc-500">
            <span>·</span>
            <span className="text-sm font-bold">{absent} absent</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setAddOpen(true)}
            className="bg-white border-2 border-zinc-200 text-zinc-700 font-extrabold text-sm px-4 py-2.5 rounded-lg hover:border-[#D72027] hover:text-[#D72027]"
          >
            ➕ Add student
          </button>
          <button
            onClick={markAllPresent}
            disabled={roster.every((r) => r.status !== null)}
            className="bg-emerald-600 text-white font-extrabold text-sm px-4 py-2.5 rounded-lg shadow-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✅ Mark all here
          </button>
        </div>
      </div>

      {/* Grid */}
      {roster.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-10 text-center text-zinc-500">
          <div className="text-5xl mb-3">🪑</div>
          <p className="font-bold text-zinc-700">No students enrolled yet.</p>
          <p className="text-sm mt-1">Add an enrolment from the Classes page.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {roster.map((student) => {
            const styleKey = student.status ?? 'null'
            const style = STATUS_STYLE[styleKey]
            const saving = savingMap[student.studentId]
            return (
              <li key={student.studentId}>
                <div
                  className={`relative rounded-2xl border-4 ${style.ring} ${style.bg} transition-all`}
                >
                  {/* Star pill (top-right) */}
                  <button
                    type="button"
                    onClick={() => setStarModal(student)}
                    className="absolute top-2 right-2 z-10 bg-white shadow-md rounded-full w-9 h-9 flex items-center justify-center text-sm font-extrabold hover:scale-110 transition-transform"
                    title={`Award a star (currently ${student.totalStars}, tier ${student.starTier})`}
                  >
                    ⭐
                  </button>

                  {/* Info / detail pill (just under the star) */}
                  <button
                    type="button"
                    onClick={() => setDetailModal(student)}
                    className="absolute top-12 right-2 z-10 bg-white shadow-md rounded-full w-9 h-9 flex items-center justify-center text-sm font-extrabold hover:scale-110 transition-transform"
                    title="Parent / DOB / payment / remove"
                  >
                    ℹ
                  </button>

                  {/* Medical badge */}
                  {student.medical && (
                    <div className="absolute top-2 left-2 z-10 bg-red-100 text-red-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-extrabold" title={student.medical}>
                      ⚕
                    </div>
                  )}

                  {/* Payment status mini-pill (bottom-left) */}
                  <div
                    className={`absolute bottom-1 left-1 z-10 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${PAYMENT_STYLE[student.paymentStatus].cls}`}
                    title={`${PAYMENT_STYLE[student.paymentStatus].label} — $${student.weeklyFee}/wk`}
                  >
                    {PAYMENT_STYLE[student.paymentStatus].icon}
                  </div>

                  {/* Main tap area */}
                  <button
                    type="button"
                    onClick={() => cycleStatus(student)}
                    className="w-full p-4 sm:p-5 text-left active:scale-95 transition-transform"
                  >
                    <div className="flex items-center justify-center text-4xl sm:text-5xl mb-2 select-none">
                      {style.emoji}
                    </div>
                    <div className="text-center">
                      <div className="font-extrabold text-zinc-900 text-base sm:text-lg leading-tight truncate">
                        {student.firstName}
                      </div>
                      {student.lastName && (
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold truncate">
                          {student.lastName}
                        </div>
                      )}
                      <div className="text-[10px] text-zinc-400 mt-1 flex justify-center gap-1.5">
                        {student.age !== null && <span>{student.age}y</span>}
                        <span>·</span>
                        <span title={`Tier ${student.starTier}`}>{'⭐'.repeat(student.starTier)}</span>
                      </div>
                      {student.starsToday > 0 && (
                        <div className="mt-1 text-[10px] font-extrabold text-amber-700 bg-amber-100 inline-block px-2 py-0.5 rounded-full">
                          +{student.starsToday} today
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Saving spinner */}
                  {saving && (
                    <div className="absolute bottom-2 right-2 text-xs text-zinc-400 animate-pulse">
                      saving…
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Star modal */}
      {starModal && (
        <StarModal
          student={starModal}
          classId={classId}
          onAward={onAward}
          onClose={() => setStarModal(null)}
          onAwarded={(starsAdded, newTotal, newTier) => {
            optimisticUpdate(starModal.studentId, {
              starsToday: starModal.starsToday + starsAdded,
              totalStars: newTotal,
              starTier: newTier,
            })
            setStarModal(null)
          }}
        />
      )}

      {/* Detail / Remove modal */}
      {detailModal && (
        <DetailModal
          student={detailModal}
          classId={classId}
          onRemove={onRemove}
          onClose={() => setDetailModal(null)}
          onRemoved={() => {
            setRoster((rs) => rs.filter((r) => r.studentId !== detailModal.studentId))
            setDetailModal(null)
          }}
        />
      )}

      {/* Add-student modal */}
      {addOpen && (
        <AddModal
          classId={classId}
          onSearch={onSearch}
          onAdd={onAdd}
          onClose={() => setAddOpen(false)}
        />
      )}

      {/* Help footer */}
      <div className="text-xs text-zinc-400 text-center pt-4">
        Tap a tile to cycle: not marked → here → late → absent. Tap ⭐ to award a star. Tap ℹ for parent / payment / remove.
      </div>
    </div>
  )
}

function DetailModal({
  student,
  classId,
  onRemove,
  onClose,
  onRemoved,
}: {
  student: RosterEntry
  classId: string
  onRemove: RemoveFn
  onClose: () => void
  onRemoved: () => void
}) {
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bday = birthdayLabel(student.dob)
  const paymentStyle = PAYMENT_STYLE[student.paymentStatus]

  async function handleRemove() {
    if (!confirm(`Remove ${student.firstName} from this class? The student stays in the CRM — just unenrolled from here.`)) return
    setRemoving(true)
    setError(null)
    const result = await onRemove({ enrolmentId: student.enrolmentId, classId })
    if (!result.ok) { setError(result.error); setRemoving(false); return }
    onRemoved()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <span className="w-14 h-14 rounded-full bg-gradient-to-br from-[#D72027] to-[#FFC107] text-white flex items-center justify-center text-lg font-extrabold shrink-0">
            {student.firstName[0]}{student.lastName?.[0] ?? ''}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xl font-extrabold text-zinc-900">{student.firstName} {student.lastName ?? ''}</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {student.age !== null ? `${student.age}y` : 'age unknown'}
              {bday && ` · birthday ${bday}`}
            </div>
          </div>
        </div>

        <dl className="space-y-2 text-sm border-t border-zinc-200 pt-3">
          <Row label="Parent" value={student.primaryParent ?? '—'} />
          <Row label="Family" value={student.familyName ?? '—'} />
          <Row label="Email" value={student.parentEmail ?? '—'} />
          <Row label="Phone" value={student.parentPhone ?? '—'} />
        </dl>

        <div className="mt-4 border-t border-zinc-200 pt-3">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500 mb-2">Payment</div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold ${paymentStyle.cls}`}>
            <span>{paymentStyle.icon}</span>
            <span>{paymentStyle.label}</span>
            {student.weeklyFee > 0 && <span className="opacity-70">· ${student.weeklyFee}/wk</span>}
          </div>
          {student.commitment && (
            <div className="text-xs text-zinc-500 mt-2">
              Roll sheet says: <span className="font-bold text-zinc-700">{student.commitment.replace(/^Commitment:\s*/, '')}</span>
            </div>
          )}
        </div>

        {student.medical && (
          <div className="mt-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl px-4 py-3 text-sm">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-red-700 mb-1">⚕ Medical note</div>
            <div className="text-red-900">{student.medical}</div>
          </div>
        )}

        {error && <div className="mt-3 text-sm text-red-700 bg-red-50 px-3 py-2 rounded">{error}</div>}

        <div className="mt-5 flex items-center justify-between gap-2 border-t border-zinc-200 pt-4">
          {student.familyId && (
            <a
              href={`/families/${student.familyId}`}
              className="text-xs font-bold text-[#D72027] hover:underline"
            >
              Open family page →
            </a>
          )}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-bold text-zinc-600 px-3 py-2 rounded-lg hover:bg-zinc-100"
            >
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
    setError(null)
    const result = await onAdd({ studentId, classId })
    setAdding(null)
    if (!result.ok) { setError(result.error); return }
    // Server-action revalidates the path, so a hard reload refreshes the roster cleanly.
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4">
          <div className="text-xl font-extrabold text-zinc-900">Add a student to this class</div>
          <div className="text-xs text-zinc-500 mt-1">Search by first name or last name. Already-enrolled students are hidden.</div>
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
                <div className="font-bold text-zinc-900 truncate">
                  {r.firstName} {r.lastName ?? ''}
                </div>
                <div className="text-[10px] text-zinc-500 truncate">
                  {r.familyName}{r.primaryParent ? ` · ${r.primaryParent}` : ''}
                </div>
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

function StarModal({
  student,
  classId,
  onAward,
  onClose,
  onAwarded,
}: {
  student: RosterEntry
  classId: string
  onAward: AwardFn
  onClose: () => void
  onAwarded: (starsAdded: number, newTotal: number, newTier: number) => void
}) {
  const [stars, setStars] = useState(1)
  const [reason, setReason] = useState<typeof STAR_REASONS[number]['value']>('skill_milestone')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    const result = await onAward({
      classId,
      studentId: student.studentId,
      stars,
      reason,
      notes: notes.trim() || null,
    })
    if (!result.ok) {
      setError(result.error)
      setSubmitting(false)
      return
    }
    onAwarded(stars, result.newTotal, result.newTier)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">⭐</span>
          <div>
            <h3 className="text-xl font-extrabold text-zinc-900">Award a star</h3>
            <p className="text-sm text-zinc-500">
              {student.firstName} {student.lastName ?? ''} · currently {student.totalStars} stars, tier {student.starTier}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Stars to award */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-2">
              How many stars?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStars(n)}
                  className={`py-3 rounded-xl font-extrabold text-lg border-2 transition-all ${
                    stars === n
                      ? 'bg-amber-100 border-amber-500 text-amber-900'
                      : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                  }`}
                >
                  {'⭐'.repeat(n)}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-2">
              What for?
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as typeof reason)}
              className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl text-base font-bold focus:border-amber-500 focus:outline-none"
            >
              {STAR_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-2">
              Note (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={140}
              placeholder="e.g. First cartwheel without help"
              className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl font-bold text-zinc-600 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-extrabold px-6 py-3 rounded-xl shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {submitting ? 'Saving…' : `Award ${stars} ⭐`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
