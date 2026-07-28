'use client'

import { useState, useMemo } from 'react'
import { Mail, Star, Clock, Inbox as InboxIcon, Send, ExternalLink, Search, MessagesSquare, Globe } from 'lucide-react'

export type Channel = 'email' | 'form' | 'facebook' | 'instagram'
export type Conversation = {
  id: string
  emailId: string | null
  channel: Channel
  fromName: string | null
  fromEmail: string | null
  subject: string | null
  preview: string
  bodyText: string | null
  receivedAt: string | null
  classification: string | null
  read: boolean
  messageId: string | null
  familyId: string | null
  familyName: string | null
  lifecycle: string | null
  draft: string | null
  source: string | null
  createdAt: string | null
}

type Tab = 'unread' | 'all' | 'recents' | 'starred'

const CLASS_LABEL: Record<string, string> = {
  trial_enquiry: 'Trial enquiry', birthday_party: 'Birthday party', ndis_enquiry: 'NDIS', school_gig: 'School gig',
  corporate_gig: 'Corporate', cancel_or_pause: 'Cancel / pause', invoice_question: 'Invoice', existing_parent: 'Existing parent',
  supplier_or_vendor: 'Supplier', newsletter_or_promo: 'Promo', junk_or_automated: 'Junk', other: 'Other',
}

function rel(iso: string | null) {
  if (!iso) return ''
  // Absolute (deterministic) — avoids server/client hydration mismatch.
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'Australia/Brisbane' })
}
function initials(s: string) { const p = s.trim().split(/\s+/); return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1]![0] : '')).toUpperCase() || '?' }
function displayName(c: Conversation) { return c.fromName || c.familyName || c.fromEmail || 'Unknown' }
const CHANNEL: Record<Channel, { label: string; Icon: typeof Mail }> = {
  email: { label: 'Email', Icon: Mail },
  form: { label: 'Website form', Icon: Globe },
  facebook: { label: 'Facebook', Icon: MessagesSquare },
  instagram: { label: 'Instagram', Icon: MessagesSquare },
}

export function ConversationsInbox({ conversations, fromEmail = null }: { conversations: Conversation[]; fromEmail?: string | null }) {
  const [tab, setTab] = useState<Tab>('all')
  const [selId, setSelId] = useState<string | null>(conversations[0]?.id ?? null)
  const [q, setQ] = useState('')

  const counts = useMemo(() => ({
    unread: conversations.filter((c) => !c.read).length,
    all: conversations.length,
  }), [conversations])

  const filtered = useMemo(() => {
    let list = conversations
    if (tab === 'unread') list = list.filter((c) => !c.read)
    if (tab === 'starred') list = []
    if (q.trim()) {
      const s = q.toLowerCase()
      list = list.filter((c) => displayName(c).toLowerCase().includes(s) || (c.subject ?? '').toLowerCase().includes(s) || (c.preview ?? '').toLowerCase().includes(s))
    }
    return list
  }, [conversations, tab, q])

  const sel = conversations.find((c) => c.id === selId) ?? null

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden flex h-[calc(100vh-220px)] min-h-[520px]">
      {/* LEFT — conversation list */}
      <div className="w-full sm:w-[320px] shrink-0 border-r border-zinc-200 flex flex-col">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-3">
            <MessagesSquare size={18} className="text-[#D72027]" />
            <h2 className="font-bold text-zinc-900">My Inbox</h2>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations…" className="w-full pl-8 pr-3 py-1.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-900" />
          </div>
        </div>
        {/* Tabs */}
        <div className="flex items-center gap-1 px-3 border-b border-zinc-100">
          {([['unread', 'Unread', Mail], ['all', 'All', InboxIcon], ['recents', 'Recents', Clock], ['starred', 'Starred', Star]] as const).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${tab === k ? 'border-[#D72027] text-[#D72027]' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}>
              <Icon size={13} /> {label}
              {k === 'unread' && counts.unread > 0 && <span className="ml-0.5 text-[10px] bg-[#D72027] text-white rounded-full px-1.5">{counts.unread}</span>}
            </button>
          ))}
        </div>
        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-400">
              <div className="w-12 h-12 rounded-full bg-zinc-100 mx-auto mb-3 flex items-center justify-center"><InboxIcon size={20} className="text-zinc-400" /></div>
              <p className="font-semibold text-zinc-600">All caught up!</p>
              <p className="text-xs mt-1">No {tab === 'all' ? '' : tab} conversations right now.</p>
            </div>
          ) : filtered.map((c) => {
            const on = c.id === selId
            const Ch = CHANNEL[c.channel].Icon
            return (
              <button key={c.id} onClick={() => setSelId(c.id)} className={`w-full text-left px-3 py-3 border-b border-zinc-50 flex gap-3 transition-colors ${on ? 'bg-red-50/60' : 'hover:bg-zinc-50'}`}>
                <span className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${c.read ? 'bg-zinc-100 text-zinc-500' : 'bg-[#D72027] text-white'}`}>{initials(displayName(c))}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`truncate text-sm ${c.read ? 'font-medium text-zinc-700' : 'font-bold text-zinc-900'}`}>{displayName(c)}</span>
                    <span className="text-[10px] text-zinc-400 shrink-0">{rel(c.receivedAt)}</span>
                  </div>
                  <div className="text-xs text-zinc-600 truncate">{c.subject || '(no subject)'}</div>
                  <div className="text-[11px] text-zinc-400 truncate flex items-center gap-1"><Ch size={10} /> {c.preview || '—'}</div>
                </div>
                {!c.read && <span className="w-2 h-2 rounded-full bg-[#D72027] self-center shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* CENTER — thread */}
      <div className="hidden sm:flex flex-1 flex-col min-w-0">
        {!sel ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-400 p-8">
            <MessagesSquare size={40} className="mb-3 text-zinc-300" />
            <p className="font-semibold text-zinc-600">No conversation selected</p>
            <p className="text-sm mt-1">Pick a conversation on the left to read &amp; reply.</p>
          </div>
        ) : (
          <Thread key={sel.id} conv={sel} fromEmail={fromEmail} />
        )}
      </div>

      {/* RIGHT — contact details */}
      <div className="hidden lg:flex w-[280px] shrink-0 border-l border-zinc-200 flex-col">
        {sel ? <ContactPanel conv={sel} /> : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-400 p-6">
            <div className="w-12 h-12 rounded-full bg-zinc-100 mb-2 flex items-center justify-center"><InboxIcon size={20} className="text-zinc-400" /></div>
            <p className="text-xs">Select a conversation to see contact details.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Thread({ conv, fromEmail = null }: { conv: Conversation; fromEmail?: string | null }) {
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<string[]>([])
  const [err, setErr] = useState('')

  async function send() {
    if (!reply.trim() || !conv.fromEmail) return
    setSending(true); setErr('')
    try {
      const r = await fetch('/api/conversations/reply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: conv.fromEmail, subject: conv.subject, body: reply, emailId: conv.emailId, messageId: conv.messageId }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Could not send')
      setSent((s) => [...s, reply]); setReply('')
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not send') } finally { setSending(false) }
  }

  return (
    <>
      <div className="px-5 py-3 border-b border-zinc-100">
        <div className="font-bold text-zinc-900">{displayName(conv)}</div>
        <div className="text-xs text-zinc-500 flex items-center gap-2"><Mail size={12} /> {conv.fromEmail || '—'} · {conv.subject || '(no subject)'}</div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-zinc-50/50">
        {/* Inbound message */}
        <div className="max-w-[80%]">
          <div className="bg-white border border-zinc-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">{conv.bodyText || '(no content)'}</div>
          <div className="text-[10px] text-zinc-400 mt-1">{conv.receivedAt ? new Date(conv.receivedAt).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Brisbane' }) : ''}</div>
        </div>
        {/* Jacky draft suggestion */}
        {conv.draft && (
          <div className="ml-auto max-w-[80%]">
            <div className="bg-amber-50 border border-dashed border-amber-300 rounded-2xl px-4 py-3 text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">{conv.draft}</div>
            <div className="text-[10px] text-amber-600 mt-1 text-right">Jacky&apos;s suggested reply — <button onClick={() => setReply(conv.draft ?? '')} className="underline font-semibold">use it</button></div>
          </div>
        )}
        {/* Sent replies (this session) */}
        {sent.map((s, i) => (
          <div key={i} className="ml-auto max-w-[80%]">
            <div className="bg-[#D72027] text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed">{s}</div>
            <div className="text-[10px] text-zinc-400 mt-1 text-right">Sent ✓</div>
          </div>
        ))}
      </div>
      {/* Reply box */}
      <div className="border-t border-zinc-200 p-3">
        {!conv.fromEmail ? (
          <p className="text-xs text-zinc-400 text-center py-2">No email address to reply to.</p>
        ) : (
          <>
            <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder={`Reply to ${displayName(conv)}…`} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-900 resize-none" />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-zinc-400">{fromEmail ? `Sends from ${fromEmail}` : 'Sends from your business email'} · your signature is added automatically</span>
              <button onClick={send} disabled={sending || !reply.trim()} className="inline-flex items-center gap-1.5 bg-[#D72027] text-white font-semibold text-sm px-4 py-1.5 rounded-lg disabled:opacity-50 hover:bg-[#A0151B]">
                <Send size={14} /> {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
            {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
          </>
        )}
      </div>
    </>
  )
}

const SOURCE_LABEL: Record<string, string> = {
  website_form: 'Website form', fb_ad: 'Facebook', instagram: 'Instagram', google: 'Google search',
  word_of_mouth: 'Word of mouth', school: 'School', walkin: 'Walk-in', open_day: 'Open day', email: 'Email', other: 'Other',
}
function fmtWhen(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Brisbane' })
}

function ContactPanel({ conv }: { conv: Conversation }) {
  const sourceLabel = conv.source ? (SOURCE_LABEL[conv.source] ?? conv.source) : (conv.channel === 'form' ? 'Website form' : null)
  const channelLabel = CHANNEL[conv.channel].label
  return (
    <div className="p-5 overflow-y-auto">
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">Activity</div>
      <div className="flex flex-col items-center text-center pb-4 border-b border-zinc-100">
        <span className="w-14 h-14 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center text-lg font-bold mb-2">{initials(displayName(conv))}</span>
        <div className="font-bold text-zinc-900">{displayName(conv)}</div>
        {conv.fromEmail && <div className="text-xs text-zinc-500 break-all">{conv.fromEmail}</div>}
      </div>

      {/* Where the lead came from */}
      <div className="py-4 border-b border-zinc-100">
        <div className="text-[10px] uppercase tracking-wide text-zinc-400 font-bold mb-1.5">Lead source</div>
        {sourceLabel ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#D72027]/10 text-[#D72027] px-2.5 py-1 rounded-full">📍 {sourceLabel}</span>
        ) : (
          <span className="text-xs text-zinc-400">Unknown — add a source on the contact.</span>
        )}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {conv.classification && <span className="text-[10px] font-semibold bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded">{CLASS_LABEL[conv.classification] ?? conv.classification}</span>}
          {conv.lifecycle && <span className="text-[10px] font-semibold capitalize bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">{conv.lifecycle}</span>}
        </div>
      </div>

      {/* Activity timeline */}
      <div className="py-4">
        <div className="text-[10px] uppercase tracking-wide text-zinc-400 font-bold mb-3">Timeline</div>
        <ol className="relative border-l border-zinc-200 ml-1 space-y-4">
          <TimelineItem title={conv.channel === 'form' ? 'Form submitted' : `${channelLabel} received`} sub={sourceLabel ? `Source: ${sourceLabel}` : channelLabel} when={fmtWhen(conv.receivedAt)} />
          {conv.draft && <TimelineItem title="Jacky drafted a reply" sub="AI suggested response ready" when="" accent />}
          {conv.createdAt && <TimelineItem title="First seen" sub="Added to your CRM" when={fmtWhen(conv.createdAt)} />}
        </ol>
      </div>

      {conv.familyId ? (
        <a href={`/contacts/${conv.familyId}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#D72027] hover:underline"><ExternalLink size={14} /> Open contact</a>
      ) : (
        <p className="text-xs text-zinc-400">Not yet linked to a contact.</p>
      )}
    </div>
  )
}

function TimelineItem({ title, sub, when, accent }: { title: string; sub: string; when: string; accent?: boolean }) {
  return (
    <li className="ml-4">
      <span className={`absolute -left-1.5 w-3 h-3 rounded-full border-2 border-white ${accent ? 'bg-amber-400' : 'bg-[#D72027]'}`} />
      <div className="text-sm font-semibold text-zinc-800">{title}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
      {when && <div className="text-[10px] text-zinc-400 mt-0.5">{when}</div>}
    </li>
  )
}
