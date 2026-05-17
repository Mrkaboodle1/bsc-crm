'use client'

// Tectonic-style unified composer. Pick a channel (Email / SMS / Internal
// note) from the icon dropdown, type, hit send. Email + SMS land in /inbox
// for Rhett's approval before they actually fly. Internal notes save
// straight to the contact's record — never sent.

import { useState, useTransition } from 'react'
import { sendComposed, type Channel } from './actions'

const CHANNELS: Array<{ id: Channel; label: string; emoji: string; help: string }> = [
  { id: 'email',    label: 'Email',    emoji: '✉️', help: 'Draft → approve in /inbox → Resend' },
  { id: 'sms',      label: 'SMS',      emoji: '💬', help: 'Draft → approve in /inbox → ClickSend' },
  { id: 'internal', label: 'Internal note', emoji: '👁', help: 'Admin-only · never sent' },
]

export function Composer({
  contactId,
  hasEmail,
  hasPhone,
}: {
  contactId: string
  hasEmail: boolean
  hasPhone: boolean
}) {
  const [channel, setChannel] = useState<Channel>(hasEmail ? 'email' : hasPhone ? 'sms' : 'internal')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    setError(null)
    setSuccess(null)
    if (!body.trim()) { setError('Type a message first.'); return }
    if (channel === 'email' && !hasEmail) { setError('No email on file for this contact.'); return }
    if (channel === 'sms' && !hasPhone) { setError('No phone on file for this contact.'); return }
    startTransition(async () => {
      const res = await sendComposed({ contactId, channel, subject, body })
      if (!res.ok) { setError(res.error); return }
      const msg = channel === 'internal'
        ? '✅ Internal note saved'
        : `✅ ${channel === 'email' ? 'Email' : 'SMS'} draft queued in /inbox`
      setSuccess(msg)
      setBody('')
      setSubject('')
      setTimeout(() => setSuccess(null), 4000)
    })
  }

  const active = CHANNELS.find((c) => c.id === channel)!
  const disabledChannel = (id: Channel) =>
    (id === 'email' && !hasEmail) || (id === 'sms' && !hasPhone)

  return (
    <div className="bg-white rounded-2xl shadow-sm border-2 border-zinc-200 overflow-hidden">
      {/* Channel selector strip */}
      <div className="flex border-b-2 border-zinc-100 bg-zinc-50">
        {CHANNELS.map((c) => {
          const off = disabledChannel(c.id)
          const sel = c.id === channel
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => !off && setChannel(c.id)}
              disabled={off}
              className={`flex-1 px-3 py-2 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors ${
                sel
                  ? c.id === 'internal'
                    ? 'bg-zinc-900 text-amber-300'
                    : 'bg-gradient-to-br from-[#D72027] to-[#A0151B] text-white'
                  : 'text-zinc-500 hover:bg-white hover:text-zinc-900'
              } ${off ? 'opacity-40 cursor-not-allowed' : ''}`}
              title={off ? 'No contact info on file' : c.help}
            >
              <span>{c.emoji}</span>
              <span className="uppercase tracking-wider">{c.label}</span>
            </button>
          )
        })}
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {channel === 'email' && (
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-sm font-bold focus:border-[#D72027] focus:outline-none"
          />
        )}
        <textarea
          placeholder={
            channel === 'email'
              ? 'Hi {first_name},\n\n…'
              : channel === 'sms'
              ? 'Hi! Just a quick one — …'
              : 'Internal note (only BSC staff can see this) — e.g. tried calling mum at 4pm, no answer'
          }
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={channel === 'sms' ? 3 : channel === 'internal' ? 4 : 8}
          maxLength={channel === 'sms' ? 480 : 8000}
          className={`w-full px-3 py-2 border-2 rounded-xl text-sm focus:outline-none ${
            channel === 'internal' ? 'border-amber-300 bg-amber-50' : 'border-zinc-200 focus:border-[#D72027]'
          }`}
        />
        <div className="flex items-baseline justify-between">
          <div className="text-[10px] text-zinc-400">
            {channel === 'sms' && `${body.length}/480 chars`}
            {channel === 'email' && `${body.length} chars · drafts go to /inbox`}
            {channel === 'internal' && '🔒 Visible only to BSC staff'}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !body.trim()}
            className={`text-sm font-extrabold px-4 py-2 rounded-xl shadow-md disabled:opacity-40 disabled:cursor-not-allowed ${
              channel === 'internal'
                ? 'bg-zinc-900 text-amber-300 hover:bg-zinc-800'
                : 'bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white hover:shadow-lg'
            }`}
          >
            {pending ? 'Saving…' : channel === 'internal' ? '👁 Save note' : `${active.emoji} Queue draft`}
          </button>
        </div>
        {error && (
          <div className="text-xs text-red-700 bg-red-50 border-l-2 border-red-400 px-2 py-1 rounded">{error}</div>
        )}
        {success && (
          <div className="text-xs text-emerald-700 bg-emerald-50 border-l-2 border-emerald-400 px-2 py-1 rounded">{success}</div>
        )}
      </div>
    </div>
  )
}
