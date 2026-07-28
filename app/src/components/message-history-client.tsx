'use client'

import { useState } from 'react'
import { Search, Download, MessageSquare, Mail, Loader2 } from 'lucide-react'

export type Thread = {
  id: string; contact_name: string | null; phone: string | null; email: string | null
  channel: string; last_message: string | null; last_at: string | null; unread: number; family_id: string | null
}
type Msg = { id: string; direction: string; channel: string | null; body: string | null; sent_at: string | null }

const when = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso), now = Date.now()
  const days = Math.floor((now - d.getTime()) / 86_400_000)
  if (days === 0) return d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
  if (days < 7) return d.toLocaleDateString('en-AU', { weekday: 'short' })
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export function MessageHistoryClient({ threads: initial, canImport }: { threads: Thread[]; canImport: boolean }) {
  const [threads] = useState(initial)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Thread | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const filtered = threads.filter((t) => {
    if (!q.trim()) return true
    const s = q.toLowerCase()
    return [t.contact_name, t.phone, t.email, t.last_message].some((v) => (v || '').toLowerCase().includes(s))
  })

  async function openThread(t: Thread) {
    setOpen(t); setMsgs([]); setLoading(true)
    try {
      const r = await fetch(`/api/conversation-messages?id=${t.id}`)
      const j = await r.json()
      setMsgs(j.messages ?? [])
    } catch { setMsgs([]) }
    setLoading(false)
  }

  async function runImport() {
    setImporting(true); setNote('Bringing conversations across from Tectonic… this can take a couple of minutes.')
    try {
      const r = await fetch('/api/tectonic-cutover?what=conversations', { method: 'POST' })
      const j = await r.json()
      if (!r.ok) setNote(`Couldn't finish: ${j.error || 'unknown error'}`)
      else { setNote(`Done — ${j.conversations?.threads ?? 0} new threads and ${j.conversations?.messages ?? 0} messages imported. Refresh to see them.`); setTimeout(() => location.reload(), 2500) }
    } catch { setNote('Could not reach the importer — try again.') }
    setImporting(false)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a parent, number or message…"
            className="w-full pl-9 pr-3 py-2.5 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none" />
        </div>
        <span className="text-sm text-zinc-500 font-semibold">{filtered.length} threads</span>
        {canImport && (
          <button onClick={runImport} disabled={importing}
            className="inline-flex items-center gap-1.5 bg-[#D72027] hover:bg-[#A0151B] text-white font-bold text-sm px-3.5 py-2.5 rounded-xl disabled:opacity-60">
            {importing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Import from Tectonic
          </button>
        )}
      </div>

      {note && <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl px-4 py-2.5 text-sm">{note}</div>}

      {threads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center text-zinc-500">
          <div className="text-4xl mb-2">💬</div>
          No conversations yet. {canImport && 'Press “Import from Tectonic” above to bring them across.'}
        </div>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,380px)_1fr] gap-4">
          {/* Threads */}
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden max-h-[70vh] overflow-y-auto">
            {filtered.map((t) => (
              <button key={t.id} onClick={() => openThread(t)}
                className={`w-full text-left px-4 py-3 border-b border-zinc-100 hover:bg-amber-50/40 ${open?.id === t.id ? 'bg-amber-50' : ''}`}>
                <div className="flex items-center gap-2">
                  {t.channel === 'email' ? <Mail size={13} className="text-zinc-400 shrink-0" /> : <MessageSquare size={13} className="text-zinc-400 shrink-0" />}
                  <span className="font-bold text-zinc-900 truncate flex-1">{t.contact_name || t.phone || t.email || 'Unknown'}</span>
                  {t.unread > 0 && <span className="bg-[#D72027] text-white text-[10px] font-black rounded-full px-1.5">{t.unread}</span>}
                  <span className="text-[11px] text-zinc-400 shrink-0">{when(t.last_at)}</span>
                </div>
                <div className="text-xs text-zinc-500 truncate mt-0.5">{(t.last_message || '').replace(/\s+/g, ' ')}</div>
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 max-h-[70vh] overflow-y-auto">
            {!open ? (
              <div className="text-center text-zinc-400 py-16">Pick a conversation to read it.</div>
            ) : (
              <>
                <div className="border-b border-zinc-100 pb-2 mb-3">
                  <div className="font-black text-zinc-900">{open.contact_name || 'Unknown'}</div>
                  <div className="text-xs text-zinc-500">{[open.phone, open.email].filter(Boolean).join(' · ')}</div>
                </div>
                {loading ? <div className="text-center text-zinc-400 py-10">Loading…</div>
                  : msgs.length === 0 ? <div className="text-center text-zinc-400 py-10 text-sm">No message history stored for this thread.<br />(History is imported for the most recent threads first.)</div>
                  : (
                    <div className="space-y-2">
                      {msgs.map((m) => {
                        const out = m.direction === 'outbound'
                        return (
                          <div key={m.id} className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${out ? 'bg-[#D72027] text-white' : 'bg-zinc-100 text-zinc-800'}`}>
                              <div className="whitespace-pre-wrap break-words">{m.body}</div>
                              <div className={`text-[10px] mt-1 ${out ? 'text-white/70' : 'text-zinc-400'}`}>
                                {out ? 'BigStar' : 'Them'}{m.sent_at ? ` · ${new Date(m.sent_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : ''}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
