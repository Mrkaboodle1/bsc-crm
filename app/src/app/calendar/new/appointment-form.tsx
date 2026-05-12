'use client'

import { useMemo, useState, useTransition } from 'react'
import { APPT_TYPE_META } from '@/lib/calendar'

type Option = { id: string; full_name?: string; family_name?: string; name?: string; familyId?: string | null }

export function AppointmentForm({
  coaches,
  families,
  students,
  action,
}: {
  coaches: Array<{ id: string; full_name: string }>
  families: Array<{ id: string; family_name: string }>
  students: Array<{ id: string; name: string; familyId: string | null }>
  action: (formData: FormData) => Promise<{ ok: true } | { ok: false; error: string }>
}) {
  const [type, setType] = useState<string>('show')
  const [familyId, setFamilyId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Default-fill start/end based on type
  const defaultStart = useMemo(() => {
    const now = new Date()
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0) // next 15-min mark
    return toLocalInput(now)
  }, [])
  const defaultEnd = useMemo(() => {
    const start = new Date(defaultStart)
    start.setHours(start.getHours() + 1)
    return toLocalInput(start)
  }, [defaultStart])

  const filteredStudents = familyId
    ? students.filter((s) => s.familyId === familyId)
    : students

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await action(fd)
      if (res && 'ok' in res && !res.ok) setError(res.error)
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 max-w-3xl space-y-5"
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Type pills */}
      <div>
        <label className="block text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-2">
          Type
        </label>
        <input type="hidden" name="type" value={type} />
        <div className="flex flex-wrap gap-2">
          {Object.entries(APPT_TYPE_META).map(([k, meta]) => (
            <button
              type="button"
              key={k}
              onClick={() => setType(k)}
              className={`px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                type === k
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
              }`}
            >
              {meta.emoji} {meta.label}
            </button>
          ))}
        </div>
      </div>

      <Field
        label="Title"
        required
        input={<input name="title" required maxLength={140} placeholder={titlePlaceholder(type)} className={inputCls} />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field
          label="Starts at"
          required
          input={<input type="datetime-local" name="start_at" required defaultValue={defaultStart} className={inputCls} />}
        />
        <Field
          label="Ends at"
          required
          input={<input type="datetime-local" name="end_at" required defaultValue={defaultEnd} className={inputCls} />}
        />
      </div>

      <Field
        label="Location"
        input={<input name="location" maxLength={200} placeholder="e.g. Holy Spirit School, Mudgeeraba" className={inputCls} />}
      />

      <Field
        label="Notes"
        input={<textarea name="notes" rows={3} maxLength={1000} placeholder="What to bring, who's running point, anything you want to remember" className={inputCls} />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field
          label="Assigned coach"
          input={
            <select name="assigned_coach_id" defaultValue="" className={inputCls}>
              <option value="">— Anyone / unassigned</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          }
        />
        <Field
          label="Alert me before"
          input={
            <select name="alert_minutes_before" defaultValue="30" className={inputCls}>
              <option value="">No alert</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="1440">1 day</option>
            </select>
          }
        />
      </div>

      {(type === 'private_lesson' || type === 'birthday_party' || type === 'workshop') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field
            label="Family (optional)"
            input={
              <select
                name="related_family_id"
                value={familyId}
                onChange={(e) => setFamilyId(e.target.value)}
                className={inputCls}
              >
                <option value="">— None</option>
                {families.map((f) => (
                  <option key={f.id} value={f.id}>{f.family_name}</option>
                ))}
              </select>
            }
          />
          <Field
            label="Student (optional)"
            input={
              <select name="related_student_id" defaultValue="" className={inputCls}>
                <option value="">— None</option>
                {filteredStudents.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            }
          />
        </div>
      )}

      {(type === 'show' || type === 'private_lesson' || type === 'birthday_party' || type === 'workshop') && (
        <Field
          label="Fee (AUD)"
          input={<input type="number" name="fee" step="0.01" min="0" placeholder="0.00" className={inputCls} />}
        />
      )}

      <div className="flex items-center gap-3 pt-2">
        <a
          href="/calendar"
          className="text-sm font-bold text-zinc-500 hover:text-zinc-900 px-4 py-3"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={pending}
          className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-6 py-3 rounded-xl shadow-md hover:shadow-lg disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save appointment'}
        </button>
      </div>
    </form>
  )
}

const inputCls = 'w-full px-4 py-2.5 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none bg-white'

function Field({
  label, required, input,
}: { label: string; required?: boolean; input: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-2">
        {label}{required && <span className="text-[#D72027]"> *</span>}
      </span>
      {input}
    </label>
  )
}

function toLocalInput(d: Date) {
  // YYYY-MM-DDTHH:mm — local-time for <input type=datetime-local>
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function titlePlaceholder(type: string): string {
  return {
    show: 'e.g. Spring Fair show',
    private_lesson: 'e.g. Private lesson — Lily aerial',
    workshop: 'e.g. Term 3 holiday workshop',
    birthday_party: 'e.g. Sophie\'s 8th birthday party',
    kno: 'e.g. KNO — Superhero theme',
    meeting: 'e.g. Coaches monthly meeting',
    personal: 'e.g. Gym, dentist, family time',
    holiday_programme: 'e.g. June holiday programme day 1',
    other: 'What is this?',
  }[type] ?? 'Title'
}
