'use client'

import { useState } from 'react'
import { Mail, Trash2, Check } from 'lucide-react'

export type Reply = {
  id: string; coach_id: string | null; from_email: string | null; from_name: string | null
  subject: string | null; body: string | null; is_read: boolean; received_at: string
}

const when = (iso: string) => new Date(iso).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export function CoachRepliesClient({ initial }: { initial: Reply[] }) {
  const [rows, setRows] = useState<Reply[]>(initial)
  const unread = rows.filter((r) => !r.is_read).length

  async function markRead(r: Reply, val = true) {
    setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, is_read: val } : x))
    fetch('/api/coach-replies', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r.id, is_read: val }) }).catch(() => {})
  }
  async function del(r: Reply) {
    if (!confirm('Delete this reply?')) return
    setRows((rs) => rs.filter((x) => x.id !== r.id))
    fetch(`/api/coach-replies?id=${r.id}`, { method: 'DELETE' }).catch(() => {})
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center max-w-2xl">
        <Mail className="mx-auto text-zinc-300 mb-3" size={32} />
        <p className="font-bold text-zinc-700">No coach replies yet.</p>
        <p className="text-sm text-zinc-500 mt-1">When a coach replies to a roster email, it'll appear here. (Needs the inbound email connection set up — ask Jacky.)</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-3xl">
      {unread > 0 && <div className="text-sm font-bold text-[#D72027]">{unread} new repl{unread === 1 ? 'y' : 'ies'}</div>}
      {rows.map((r) => (
        <div key={r.id} className={`bg-white rounded-2xl border-2 p-4 ${r.is_read ? 'border-zinc-200' : 'border-[#D72027]'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-extrabold text-zinc-900">{r.from_name || r.from_email}{!r.is_read && <span className="ml-2 text-[10px] font-extrabold uppercase bg-[#D72027] text-white px-1.5 py-0.5 rounded">New</span>}</div>
              <div className="text-[11px] text-zinc-400">{r.from_email} · {when(r.received_at)}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!r.is_read && <button onClick={() => markRead(r)} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 border border-emerald-200 px-2 py-1.5 rounded-lg hover:bg-emerald-50"><Check size={13} /> Mark read</button>}
              {r.from_email && <a href={`mailto:${r.from_email}?subject=${encodeURIComponent('Re: ' + (r.subject || ''))}`} className="inline-flex items-center gap-1 text-xs font-bold text-zinc-700 border border-zinc-200 px-2 py-1.5 rounded-lg hover:bg-zinc-50"><Mail size={13} /> Reply</a>}
              <button onClick={() => del(r)} className="p-1.5 text-zinc-300 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          </div>
          {r.subject && <div className="text-sm font-bold text-zinc-700 mt-2">{r.subject}</div>}
          <p className="text-sm text-zinc-700 mt-1 whitespace-pre-wrap">{r.body}</p>
        </div>
      ))}
    </div>
  )
}
