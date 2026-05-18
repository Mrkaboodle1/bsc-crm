'use client'

// Tectonic-style "DND" toggle panel. Master "All channels" switch OR
// per-channel opt-outs. Optimistic updates with revert on failure.

import { useState, useTransition } from 'react'
import { setDnd, deleteContact } from './actions'

export type DndState = {
  email: boolean
  sms: boolean
  calls: boolean
  all: boolean
}

export function DndPanel({
  contactId,
  contactName,
  initial,
}: {
  contactId: string
  contactName: string
  initial: DndState
}) {
  const [state, setState] = useState<DndState>(initial)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [, startTransition] = useTransition()

  function toggle(key: keyof DndState) {
    const previous = state
    const next = { ...state, [key]: !state[key] }
    setState(next)
    setError(null)
    startTransition(async () => {
      const res = await setDnd({ contactId, dnd: { [key]: next[key] } })
      if (!res.ok) {
        setState(previous)
        setError(res.error)
      }
    })
  }

  function handleDelete() {
    const typed = prompt(
      `This permanently removes ${contactName} from the CRM (kids, enrolments, attendance — everything).\n\nType the contact's first name to confirm:`
    )
    if (!typed) return
    const first = contactName.trim().split(/\s+/)[0]?.toLowerCase()
    if (typed.trim().toLowerCase() !== first) {
      alert(`That didn't match "${first}". Nothing deleted.`)
      return
    }
    setDeleting(true)
    setError(null)
    startTransition(async () => {
      const res = await deleteContact({ contactId })
      if (!res.ok) {
        setError(res.error)
        setDeleting(false)
        return
      }
      // Successful delete — kick to /contacts list
      window.location.href = '/contacts'
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-3">
        Do Not Disturb
      </div>

      {/* Master switch */}
      <label className="flex items-center justify-between gap-3 cursor-pointer py-1.5">
        <span className="text-sm font-extrabold text-zinc-900">DND All Channels</span>
        <input
          type="checkbox"
          checked={state.all}
          onChange={() => toggle('all')}
          className="w-5 h-5 accent-[#D72027] cursor-pointer"
        />
      </label>

      <div className="my-3 text-[10px] uppercase tracking-wider text-zinc-400 text-center">OR</div>

      <ul className="space-y-1 text-sm">
        <ChannelRow icon="✉️"  label="Email"             checked={state.email} disabled={state.all} onToggle={() => toggle('email')} />
        <ChannelRow icon="💬"  label="Text Messages"     checked={state.sms}   disabled={state.all} onToggle={() => toggle('sms')} />
        <ChannelRow icon="📞"  label="Calls & voicemail" checked={state.calls} disabled={state.all} onToggle={() => toggle('calls')} />
      </ul>

      {error && (
        <div className="mt-3 text-xs text-red-700 bg-red-50 border-l-2 border-red-400 px-2 py-1 rounded">{error}</div>
      )}

      <p className="text-[10px] text-zinc-400 mt-3 leading-relaxed">
        DND is enforced at <strong>send-time</strong>: even if you approve a draft for this contact in /inbox, Jacky will silently skip the send. Internal notes still work.
      </p>

      {/* Delete contact */}
      <div className="mt-4 pt-4 border-t border-zinc-200">
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-2">
          Danger zone
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="w-full bg-white border-2 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-500 font-extrabold text-sm px-3 py-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
        >
          🗑 {deleting ? 'Deleting…' : 'Delete this contact'}
        </button>
        <p className="text-[10px] text-zinc-400 mt-1.5 text-center leading-tight">
          Removes the contact + all linked kids, enrolments, and attendance.<br />Drafts and email history are preserved in audit log.
        </p>
      </div>
    </div>
  )
}

function ChannelRow({
  icon,
  label,
  checked,
  disabled,
  onToggle,
}: {
  icon: string
  label: string
  checked: boolean
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <li>
      <label className={`flex items-center justify-between gap-3 py-1.5 ${disabled ? 'opacity-40' : 'cursor-pointer'}`}>
        <span className="flex items-center gap-2 text-zinc-700">
          <span>{icon}</span>
          <span>{label}</span>
        </span>
        <input
          type="checkbox"
          checked={checked || disabled}
          disabled={disabled}
          onChange={onToggle}
          className="w-5 h-5 accent-[#D72027] cursor-pointer disabled:cursor-not-allowed"
        />
      </label>
    </li>
  )
}
