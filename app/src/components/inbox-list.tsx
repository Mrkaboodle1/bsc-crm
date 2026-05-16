'use client'

import { useState, useTransition } from 'react'
import { approveAction, rejectAction, editAndApproveAction } from '@/app/inbox/actions'

export type InboxRow = {
  id: string
  kind: string
  triggeredBy: string
  status: string
  priority: string
  reasoning: string | null
  draftSubject: string | null
  draftBody: string | null
  draftRecipient: string | null
  createdAt: string
  family: { id: string; name: string; lifecycle: string | null } | null
  sourceEmail: {
    id: string
    fromEmail: string | null
    fromName: string | null
    subject: string | null
    bodyText: string | null
    receivedAt: string
    classification: string | null
  } | null
}

const PRIORITY_STYLE: Record<string, { ring: string; pill: string; label: string }> = {
  urgent: { ring: 'border-red-500', pill: 'bg-red-100 text-red-900', label: '🔥 Urgent' },
  high:   { ring: 'border-amber-400', pill: 'bg-amber-100 text-amber-900', label: '⚡ High' },
  normal: { ring: 'border-zinc-200', pill: 'bg-zinc-100 text-zinc-700', label: 'Normal' },
  low:    { ring: 'border-zinc-100', pill: 'bg-zinc-50 text-zinc-500', label: 'Low' },
}

const CLASSIFICATION_EMOJI: Record<string, string> = {
  trial_enquiry: '🎯',
  birthday_party: '🎉',
  ndis_enquiry: '💜',
  school_gig: '🏫',
  corporate_gig: '🏢',
  cancel_or_pause: '⏸',
  invoice_question: '💳',
  existing_parent: '👨‍👩‍👧',
  supplier_or_vendor: '📦',
  newsletter_or_promo: '📰',
  junk_or_automated: '🗑',
  other: '✨',
}

export function InboxList({ rows }: { rows: InboxRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-10 text-center text-zinc-500">
        <div className="text-5xl mb-3">🎪</div>
        <p className="font-bold text-zinc-700">No drafts waiting.</p>
        <p className="text-sm mt-1">When Jacky drafts replies, they&apos;ll show up here.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-4">
      {rows.map((r) => (
        <InboxItem key={r.id} row={r} />
      ))}
    </ul>
  )
}

function InboxItem({ row }: { row: InboxRow }) {
  const style = PRIORITY_STYLE[row.priority] ?? PRIORITY_STYLE.normal!
  const isSms = row.kind === 'sms_reply' || row.kind === 'sms_outbound'
  const isBulk = row.triggeredBy === 'campaign'
  const classificationEmoji = row.sourceEmail?.classification
    ? CLASSIFICATION_EMOJI[row.sourceEmail.classification] ?? '✨'
    : isSms ? '📱' : isBulk ? '📨' : '✉️'

  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draftSubject, setDraftSubject] = useState(row.draftSubject ?? '')
  const [draftBody, setDraftBody] = useState(row.draftBody ?? '')
  const [showReasoning, setShowReasoning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<null | 'approved' | 'rejected'>(null)
  const [pending, startTransition] = useTransition()

  function doApprove() {
    setError(null)
    startTransition(async () => {
      const res = editing
        ? await editAndApproveAction({ id: row.id, draftSubject, draftBody })
        : await approveAction(row.id)
      if (!res.ok) setError(res.error)
      else setDone('approved')
    })
  }

  function doReject() {
    const reason = prompt('Reject reason (optional)?') ?? null
    setError(null)
    startTransition(async () => {
      const res = await rejectAction(row.id, reason)
      if (!res.ok) setError(res.error)
      else setDone('rejected')
    })
  }

  if (done) {
    return (
      <li
        className={`rounded-2xl shadow-sm border-2 p-5 text-center text-sm font-bold ${
          done === 'approved'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-zinc-100 border-zinc-200 text-zinc-600'
        }`}
      >
        {done === 'approved' ? '✅ Approved — will send shortly' : '✖ Rejected'}
      </li>
    )
  }

  return (
    <li className={`bg-white rounded-2xl shadow-sm border-2 ${style.ring} overflow-hidden`}>
      {/* Header bar */}
      <div className="px-5 py-3 flex items-center gap-3 border-b border-zinc-100 bg-zinc-50/50">
        <span className="text-2xl">{classificationEmoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${style.pill}`}>
              {style.label}
            </span>
            {row.sourceEmail?.classification && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {row.sourceEmail.classification.replace('_', ' ')}
              </span>
            )}
            {row.family && (
              <a
                href={`/families/${row.family.id}`}
                className="text-xs font-bold text-zinc-700 hover:text-[#D72027] hover:underline"
              >
                {row.family.name}
              </a>
            )}
          </div>
          <div className="text-sm font-extrabold text-zinc-900 mt-0.5 truncate">
            {row.sourceEmail?.subject ?? row.draftSubject ?? '(no subject)'}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5 flex items-baseline gap-2">
            <span>From: {row.sourceEmail?.fromName ?? row.sourceEmail?.fromEmail ?? '—'}</span>
            <span>·</span>
            <span>To: {row.draftRecipient ?? '—'}</span>
            <span>·</span>
            <span>{new Date(row.createdAt).toLocaleString('en-AU')}</span>
          </div>
        </div>
      </div>

      {/* Original email body */}
      {row.sourceEmail?.bodyText && (
        <details className="px-5 py-3 border-b border-zinc-100 text-sm" open={expanded}>
          <summary
            className="cursor-pointer text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-900"
            onClick={(e) => { e.preventDefault(); setExpanded((v) => !v) }}
          >
            {expanded ? '▾ Hide original email' : '▸ Show original email'}
          </summary>
          {expanded && (
            <pre className="mt-3 whitespace-pre-wrap text-xs text-zinc-700 bg-zinc-50 p-3 rounded-lg max-h-64 overflow-auto">
              {row.sourceEmail.bodyText}
            </pre>
          )}
        </details>
      )}

      {/* Jacky's reasoning */}
      {row.reasoning && (
        <details className="px-5 py-3 border-b border-zinc-100 text-sm">
          <summary
            className="cursor-pointer text-xs font-bold uppercase tracking-wider text-[#D72027] hover:underline"
            onClick={(e) => { e.preventDefault(); setShowReasoning((v) => !v) }}
          >
            {showReasoning ? '▾ Hide Jacky\'s thinking' : '🧠 Why Jacky drafted this'}
          </summary>
          {showReasoning && (
            <p className="mt-3 text-xs italic text-zinc-600">{row.reasoning}</p>
          )}
        </details>
      )}

      {/* Draft */}
      <div className="px-5 py-4 space-y-3">
        <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">
          Draft reply
        </div>
        {editing ? (
          <>
            <input
              value={draftSubject}
              onChange={(e) => setDraftSubject(e.target.value)}
              className="w-full px-3 py-2 border-2 border-zinc-200 rounded-lg text-sm font-bold focus:border-[#D72027] focus:outline-none"
              placeholder="Subject"
            />
            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 border-2 border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none font-mono"
              placeholder="Body"
            />
          </>
        ) : (
          <>
            <div className="text-sm font-bold text-zinc-900">{row.draftSubject ?? '(no subject)'}</div>
            <pre className="whitespace-pre-wrap text-sm text-zinc-700 bg-zinc-50 p-3 rounded-lg">
              {row.draftBody ?? '(no body)'}
            </pre>
          </>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 py-3 bg-zinc-50/50 border-t border-zinc-100 flex items-center gap-2 flex-wrap">
        {!editing ? (
          <>
            <button
              onClick={doApprove}
              disabled={pending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm px-4 py-2.5 rounded-lg shadow disabled:opacity-50"
            >
              {pending ? 'Sending…' : '✅ Approve + Send'}
            </button>
            <button
              onClick={() => setEditing(true)}
              disabled={pending}
              className="bg-white border-2 border-zinc-300 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50 disabled:opacity-50"
            >
              ✏️ Edit
            </button>
            <button
              onClick={doReject}
              disabled={pending}
              className="text-zinc-500 hover:text-red-700 font-bold text-sm px-4 py-2.5 disabled:opacity-50"
            >
              ✖ Reject
            </button>
          </>
        ) : (
          <>
            <button
              onClick={doApprove}
              disabled={pending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm px-4 py-2.5 rounded-lg shadow disabled:opacity-50"
            >
              {pending ? 'Sending…' : '✅ Save + Approve + Send'}
            </button>
            <button
              onClick={() => { setEditing(false); setDraftSubject(row.draftSubject ?? ''); setDraftBody(row.draftBody ?? '') }}
              disabled={pending}
              className="text-zinc-500 hover:text-zinc-900 font-bold text-sm px-3 py-2.5"
            >
              Cancel edit
            </button>
          </>
        )}
      </div>
    </li>
  )
}
