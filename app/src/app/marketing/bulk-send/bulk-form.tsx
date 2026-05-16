'use client'

import { useMemo, useState, useTransition } from 'react'

export type FamilyOption = {
  id: string
  name: string
  primaryParent: string | null
  email: string | null
  phone: string | null
  lifecycle: string | null
  tags: string[]
}

const LIFECYCLE_FILTERS = [
  { id: 'all',    label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'trial',  label: 'Trial' },
  { id: 'lead',   label: 'Lead' },
  { id: 'paused', label: 'Paused' },
  { id: 'lost',   label: 'Lost' },
] as const

const PRIORITIES = [
  { id: 'low',    label: 'Low' },
  { id: 'normal', label: 'Normal' },
  { id: 'high',   label: 'High' },
  { id: 'urgent', label: '🔥 Urgent' },
] as const

type BulkResult =
  | { ok: true; created: number; skipped: number; reasons: string[] }
  | { ok: false; error: string }

export function BulkForm({
  families,
  action,
}: {
  families: FamilyOption[]
  action: (formData: FormData) => Promise<BulkResult>
}) {
  const [channel, setChannel] = useState<'email' | 'sms'>('email')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState<string>('normal')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // All unique tags across families (for the tag filter dropdown).
  const allTags = useMemo(() => {
    const t = new Set<string>()
    for (const f of families) for (const tag of f.tags) t.add(tag)
    return Array.from(t).sort()
  }, [families])

  // Apply filters
  const visible = useMemo(() => {
    return families.filter((f) => {
      if (stageFilter !== 'all' && f.lifecycle !== stageFilter) return false
      if (tagFilter && !f.tags.includes(tagFilter)) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const hay = `${f.name} ${f.primaryParent ?? ''} ${f.email ?? ''} ${f.phone ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      // Channel reachability filter — no point showing email-less rows for an email blast
      if (channel === 'email' && !f.email) return false
      if (channel === 'sms' && !f.phone) return false
      return true
    })
  }, [families, stageFilter, tagFilter, search, channel])

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev)
      const allOn = visible.every((f) => next.has(f.id))
      if (allOn) for (const f of visible) next.delete(f.id)
      else for (const f of visible) next.add(f.id)
      return next
    })
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    fd.set('channel', channel)
    fd.set('subject', subject)
    fd.set('body', body)
    fd.set('priority', priority)
    for (const id of selected) fd.append('family_ids', id)
    startTransition(async () => {
      const res = await action(fd)
      if ('ok' in res && !res.ok) setError(res.error)
      // success → server action redirects to /inbox
    })
  }

  const bodyMax = channel === 'sms' ? 480 : 6000
  const overLimit = body.length > bodyMax
  const smsSegments = channel === 'sms' ? Math.max(1, Math.ceil(body.length / 160)) : 0
  const costEstimate = channel === 'sms' ? selected.size * smsSegments * 0.08 : selected.size * 0.0004

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Channel toggle */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-zinc-200 p-5">
        <label className="block text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-2">Channel</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setChannel('email')}
            className={`flex-1 px-4 py-3 rounded-xl border-2 font-bold text-sm ${
              channel === 'email' ? 'border-[#D72027] bg-red-50 text-[#D72027]' : 'border-zinc-200 bg-white text-zinc-600'
            }`}
          >
            📧 Email <span className="text-xs opacity-70 ml-1">(via Resend)</span>
          </button>
          <button
            type="button"
            onClick={() => setChannel('sms')}
            className={`flex-1 px-4 py-3 rounded-xl border-2 font-bold text-sm ${
              channel === 'sms' ? 'border-[#D72027] bg-red-50 text-[#D72027]' : 'border-zinc-200 bg-white text-zinc-600'
            }`}
          >
            📱 SMS <span className="text-xs opacity-70 ml-1">(via ClickSend · BigStar)</span>
          </button>
        </div>
      </div>

      {/* Recipient picker */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-zinc-200 p-5">
        <div className="flex items-baseline justify-between mb-3">
          <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">
            Recipients <span className="text-zinc-400">({selected.size} selected · {visible.length} shown)</span>
          </label>
          <button
            type="button"
            onClick={toggleAllVisible}
            className="text-xs font-bold text-[#D72027] hover:underline"
          >
            {visible.every((f) => selected.has(f.id)) && visible.length > 0 ? 'Deselect all' : 'Select all visible'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
          <input
            type="search"
            placeholder="Search name / parent / email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border-2 border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none"
          />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-2 border-2 border-zinc-200 rounded-lg text-sm font-bold focus:border-[#D72027] focus:outline-none"
          >
            {LIFECYCLE_FILTERS.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="px-3 py-2 border-2 border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none"
          >
            <option value="">Any tag</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="border border-zinc-200 rounded-xl max-h-72 overflow-auto divide-y divide-zinc-100">
          {visible.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-500">
              No families match those filters {channel === 'email' ? 'with an email on file' : 'with a phone on file'}.
            </div>
          ) : (
            visible.map((f) => (
              <label
                key={f.id}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer text-sm hover:bg-zinc-50 ${
                  selected.has(f.id) ? 'bg-red-50/50' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(f.id)}
                  onChange={() => toggleOne(f.id)}
                  className="w-4 h-4 accent-[#D72027]"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-zinc-900 truncate">{f.name}</div>
                  <div className="text-xs text-zinc-500 truncate">
                    {f.primaryParent ?? '—'} · {channel === 'email' ? f.email : f.phone}
                    {f.lifecycle && <span className="ml-2 text-[10px] uppercase font-bold text-zinc-400">{f.lifecycle}</span>}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>
      </div>

      {/* Compose */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-zinc-200 p-5 space-y-4">
        <div className="flex items-baseline gap-3 flex-wrap">
          <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Compose</label>
          <span className="text-xs text-zinc-400">
            Tip: <code className="bg-zinc-100 px-1 py-0.5 rounded">{'{first_name}'}</code> and <code className="bg-zinc-100 px-1 py-0.5 rounded">{'{family_name}'}</code> auto-fill per recipient.
          </span>
        </div>

        {channel === 'email' && (
          <input
            type="text"
            placeholder="Subject (the parent sees this in their inbox)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl text-sm font-bold focus:border-[#D72027] focus:outline-none"
          />
        )}

        <textarea
          placeholder={
            channel === 'email'
              ? "Hi {first_name}! 😊\n\nQuick reminder about our school holiday programme starting next Tuesday…"
              : 'Hi {first_name}! Just a quick one — our holiday programme starts Tuesday 9am. Bookings: bigstarcircus.com.au/book 🎪 BSC'
          }
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={channel === 'sms' ? 5 : 12}
          className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none ${
            overLimit ? 'border-red-500' : 'border-zinc-200 focus:border-[#D72027]'
          }`}
        />

        <div className="flex items-baseline justify-between text-xs">
          <div className="text-zinc-500">
            {body.length} / {bodyMax} chars
            {channel === 'sms' && body.length > 0 && (
              <span className="ml-2">· {smsSegments} segment{smsSegments === 1 ? '' : 's'} per recipient</span>
            )}
          </div>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="px-2 py-1 border border-zinc-200 rounded-lg text-xs font-bold"
          >
            {PRIORITIES.map((p) => (
              <option key={p.id} value={p.id}>Priority: {p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Submit row */}
      <div className="bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-300 p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="text-sm">
          <div className="font-extrabold text-zinc-900">
            {selected.size} draft{selected.size === 1 ? '' : 's'} → /inbox for approval
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Estimated cost if you approve all: <span className="font-bold">${costEstimate.toFixed(2)}</span>
            {channel === 'sms' && <span> · ~$0.08/SMS</span>}
            {channel === 'email' && <span> · ~$0.0004/email via Resend</span>}
          </div>
        </div>
        <button
          type="submit"
          disabled={pending || selected.size === 0 || !body.trim() || (channel === 'email' && !subject.trim()) || overLimit}
          className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-5 py-3 rounded-xl shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? 'Creating drafts…' : `🎪 Create ${selected.size} draft${selected.size === 1 ? '' : 's'}`}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}
    </form>
  )
}
