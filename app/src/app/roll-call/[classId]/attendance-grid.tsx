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

export type RosterEntry = {
  enrolmentId: string
  studentId: string
  firstName: string
  lastName: string | null
  age: number | null
  medical: string | null
  starTier: number
  totalStars: number
  attendanceId: string | null
  status: Status | null
  starsToday: number
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
}: {
  classId: string
  date: string
  roster: RosterEntry[]
  onMark: MarkFn
  onAward: AwardFn
}) {
  const [roster, setRoster] = useState(initialRoster)
  const [starModal, setStarModal] = useState<RosterEntry | null>(null)
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

                  {/* Medical badge */}
                  {student.medical && (
                    <div className="absolute top-2 left-2 z-10 bg-red-100 text-red-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-extrabold" title={student.medical}>
                      ⚕
                    </div>
                  )}

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

      {/* Help footer */}
      <div className="text-xs text-zinc-400 text-center pt-4">
        Tap a tile to cycle: not marked → here → late → absent. Tap the ⭐ to award a star.
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
