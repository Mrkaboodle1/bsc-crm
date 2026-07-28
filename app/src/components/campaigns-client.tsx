'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, MessageSquare, Share2, Plus, Trash2, CalendarClock, Send, Check, Copy, Image as ImageIcon, BarChart3, X } from 'lucide-react'
import { NewsletterEditor, migrateToBlocks, defaultHeader, type Block, type Header } from '@/components/newsletter-editor'

export type Campaign = {
  id: string
  channel: 'email' | 'sms' | 'social'
  title: string
  month: string | null
  subject: string | null
  content: Record<string, any> | null // eslint-disable-line @typescript-eslint/no-explicit-any
  image_url: string | null
  status: 'draft' | 'scheduled' | 'sent' | 'archived'
  scheduled_for: string | null
  sort: number
}
type Branding = { name: string; logoUrl: string; primary: string; accent: string; phone: string; website: string }

const CHANNELS = [
  { key: 'email', label: 'Newsletters', Icon: Mail },
  { key: 'sms', label: 'Texts', Icon: MessageSquare },
  { key: 'social', label: 'Social posts', Icon: Share2 },
] as const
const STATUS_CHIP: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-600', scheduled: 'bg-amber-100 text-amber-800',
  sent: 'bg-emerald-100 text-emerald-700', archived: 'bg-zinc-100 text-zinc-400',
}
const monthLabel = (m: string | null) => m ? new Date(m + '-01T00:00:00').toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }) : 'Other'

export function CampaignsClient({ initial, branding, images, setupNeeded, setupSql }: {
  initial: Campaign[]; branding: Branding; images: string[]; setupNeeded: boolean; setupSql: string
}) {
  const router = useRouter()
  const [items, setItems] = useState<Campaign[]>(initial)
  const [tab, setTab] = useState<'email' | 'sms' | 'social'>('email')
  const [sel, setSel] = useState<Campaign | null>(initial[0] ?? null)
  const [busy, setBusy] = useState(false)
  const [posting, setPosting] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [showResults, setShowResults] = useState(false)

  if (setupNeeded) return <SetupCard sql={setupSql} />

  const shown = items.filter((c) => c.channel === tab)
  const c = sel && items.find((x) => x.id === sel.id) ? sel : null

  const patch = (id: string, p: Partial<Campaign>) => setItems((xs) => xs.map((x) => x.id === id ? { ...x, ...p } : x))
  const setField = (key: string, val: string) => { if (!c) return; const content = { ...(c.content ?? {}), [key]: val }; setSel({ ...c, content }); patch(c.id, { content }) }

  async function save() {
    if (!c) return; setBusy(true)
    await fetch('/api/campaigns', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, title: c.title, subject: c.subject, content: c.content, image_url: c.image_url }) })
    setBusy(false); router.refresh()
  }
  async function create(channel: 'email' | 'sms' | 'social') {
    const body = { channel, title: channel === 'email' ? 'New newsletter' : channel === 'sms' ? 'New text' : 'New post', content: {} }
    const r = await fetch('/api/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json(); if (j.campaign) { setItems((xs) => [...xs, j.campaign]); setSel(j.campaign); setTab(channel) }
  }
  async function remove(id: string) {
    if (!confirm('Delete this campaign? This cannot be undone.')) return
    await fetch(`/api/campaigns?id=${id}`, { method: 'DELETE' }); setItems((xs) => xs.filter((x) => x.id !== id)); if (sel?.id === id) setSel(null)
  }
  async function setStatus(status: Campaign['status'], scheduled_for?: string) {
    if (!c) return
    await fetch('/api/campaigns', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, status, scheduled_for: scheduled_for ?? null }) })
    patch(c.id, { status, scheduled_for: scheduled_for ?? null }); setSel({ ...c, status, scheduled_for: scheduled_for ?? null })
  }
  // Social: publish straight to Instagram + Facebook.
  async function publishSocial() {
    if (!c) return
    const caption = [c.content?.caption, c.content?.hashtags].filter(Boolean).join('\n\n')
    if (!caption && !c.image_url) { alert('Add a caption or image first.'); return }
    if (!confirm('Post this to Instagram AND Facebook now?')) return
    setPosting(true)
    try {
      const r = await fetch('/api/social/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: c.id, caption, imageUrl: c.image_url, channels: ['instagram', 'facebook'] }) })
      const j = await r.json()
      if (j.ok) {
        patch(c.id, { status: 'sent' }); setSel({ ...c, status: 'sent' })
        const ig = j.results?.instagram, fb = j.results?.facebook
        alert(`Posted! ${ig ? (ig.ok ? '✓ Instagram' : '✗ Instagram: ' + ig.error) : ''}  ${fb ? (fb.ok ? '✓ Facebook' : '✗ Facebook: ' + fb.error) : ''}`)
      } else {
        alert('Could not post. ' + (j.error || JSON.stringify(j.results || {})))
      }
    } catch { alert('Could not reach the posting service.') } finally { setPosting(false) }
  }

  return (
    <div className="grid lg:grid-cols-[300px_1fr] gap-5">
      {/* LEFT — list */}
      <div className="space-y-3">
        <div className="flex gap-1.5">
          {CHANNELS.map((ch) => (
            <button key={ch.key} onClick={() => setTab(ch.key)} className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-semibold ${tab === ch.key ? 'border-[#D72027] bg-red-50 text-[#D72027]' : 'border-zinc-200 text-zinc-500'}`}>
              <ch.Icon size={16} /> {ch.label}
            </button>
          ))}
        </div>
        <button onClick={() => create(tab)} className="w-full inline-flex items-center justify-center gap-1.5 bg-[#D72027] text-white text-sm font-semibold py-2 rounded-lg hover:bg-[#A0151B]"><Plus size={15} /> New {CHANNELS.find((x) => x.key === tab)?.label.replace(/s$/, '')}</button>
        <div className="space-y-1.5 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
          {shown.length === 0 && <p className="text-center text-xs text-zinc-400 py-6">Nothing here yet — tap “New”.</p>}
          {shown.map((x) => (
            <button key={x.id} onClick={() => setSel(x)} className={`w-full text-left p-3 rounded-lg border ${c?.id === x.id ? 'border-[#D72027] bg-red-50/40' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm text-zinc-900 truncate">{x.title}</span>
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${STATUS_CHIP[x.status]}`}>{x.status}</span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">{monthLabel(x.month)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT — editor */}
      <div>
        {!c && <div className="bg-white rounded-xl border border-zinc-200 p-10 text-center text-sm text-zinc-400">Pick a campaign on the left, or tap “New”.</div>}
        {c && (
          <div className="space-y-4">
            {/* toolbar */}
            <div className="bg-white rounded-xl border border-zinc-200 p-3 flex items-center gap-2 flex-wrap">
              <input value={c.title} onChange={(e) => { setSel({ ...c, title: e.target.value }); patch(c.id, { title: e.target.value }) }} className="font-bold text-zinc-900 border-0 focus:outline-none flex-1 min-w-[140px]" />
              <button onClick={save} disabled={busy} className="inline-flex items-center gap-1 bg-zinc-900 text-white text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50">{busy ? 'Saving…' : <><Check size={13} /> Save</>}</button>
              <ScheduleButton onSchedule={(d) => setStatus('scheduled', d)} />
              {c.channel === 'email' && <button onClick={() => setShowResults((s) => !s)} className="inline-flex items-center gap-1 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-700"><BarChart3 size={13} /> Results</button>}
              <button onClick={() => c.channel === 'social' ? publishSocial() : c.channel === 'email' ? setSendOpen(true) : setStatus('sent')} disabled={posting} className="inline-flex items-center gap-1 bg-[#D72027] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#A0151B] disabled:opacity-50" title={c.channel === 'social' ? 'Publishes straight to Instagram & Facebook' : c.channel === 'email' ? 'Send this newsletter to your contacts' : 'Marks as sent'}><Send size={13} /> {posting ? 'Posting…' : c.channel === 'social' ? 'Post' : 'Send'}</button>
              <button onClick={() => remove(c.id)} className="inline-flex items-center gap-1 text-red-600 text-xs font-semibold px-2 py-2 rounded-lg hover:bg-red-50"><Trash2 size={13} /></button>
            </div>
            {showResults && c.channel === 'email' && <ResultsPanel campaignId={c.id} />}
            {sendOpen && c.channel === 'email' && <SendDialog campaign={c} onClose={() => setSendOpen(false)} onSent={() => { patch(c.id, { status: 'sent' }); setSel({ ...c, status: 'sent' }); router.refresh() }} />}

            {/* fields per channel */}
            {c.channel === 'email' && <EmailEditor key={c.id} c={c} setSel={setSel} patch={patch} branding={branding} images={images} />}
            {c.channel === 'sms' && <SmsEditor c={c} setField={setField} />}
            {c.channel === 'social' && <SocialEditor c={c} setField={setField} setSel={setSel} patch={patch} images={images} />}
          </div>
        )}
      </div>
    </div>
  )
}

const inp = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-900'
const lbl = 'text-xs font-bold uppercase tracking-wide text-zinc-400 mb-1 block'

function EmailEditor({ c, setSel, patch, branding, images }: { c: Campaign; setSel: (x: Campaign) => void; patch: (id: string, p: Partial<Campaign>) => void; branding: Branding; images: string[] }) {
  const [blocks, setBlocksState] = useState<Block[]>(() => migrateToBlocks(c.content))
  const [header, setHeaderState] = useState<Header>(() => defaultHeader(c.content, branding.name, monthLabel(c.month)))
  const setBlocks = (b: Block[]) => {
    setBlocksState(b)
    const content = { ...(c.content ?? {}), blocks: b }
    setSel({ ...c, content }); patch(c.id, { content })
  }
  const setHeader = (h: Header) => {
    setHeaderState(h)
    const content = { ...(c.content ?? {}), header: h }
    setSel({ ...c, content }); patch(c.id, { content })
  }
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-zinc-200 p-3">
        <span className={lbl}>Subject line</span>
        <input className={inp} value={c.subject ?? ''} onChange={(e) => { setSel({ ...c, subject: e.target.value }); patch(c.id, { subject: e.target.value }) }} placeholder="e.g. July at Big Star Circus 🎪" />
      </div>
      <NewsletterEditor blocks={blocks} onChange={setBlocks} branding={branding} images={images} monthLabel={monthLabel(c.month)} header={header} onHeaderChange={setHeader} />
    </div>
  )
}

function SmsEditor({ c, setField }: { c: Campaign; setField: (k: string, v: string) => void }) {
  const text = c.content?.text ?? ''
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 max-w-xl">
      <span className={lbl}>Text message</span>
      <textarea className={inp} rows={4} value={text} onChange={(e) => setField('text', e.target.value)} placeholder="Keep it short & friendly…" />
      <div className="text-xs text-zinc-400 mt-1">{text.length} characters · {Math.max(1, Math.ceil(text.length / 160))} SMS</div>
    </div>
  )
}

function SocialEditor({ c, setField, setSel, patch, images }: { c: Campaign; setField: (k: string, v: string) => void; setSel: (x: Campaign) => void; patch: (id: string, p: Partial<Campaign>) => void; images: string[] }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
        <div><span className={lbl}>Caption</span><textarea className={inp} rows={6} value={c.content?.caption ?? ''} onChange={(e) => setField('caption', e.target.value)} placeholder="Write your post…" /></div>
        <div><span className={lbl}>Hashtags</span><input className={inp} value={c.content?.hashtags ?? ''} onChange={(e) => setField('hashtags', e.target.value)} placeholder="#BigStarCircus #GoldCoastKids" /></div>
        <ImagePicker value={c.image_url} images={images} onPick={(u) => { setSel({ ...c, image_url: u }); patch(c.id, { image_url: u }) }} />
        <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1.5">✓ Connected. Hitting <strong>Post</strong> publishes this straight to your Instagram <strong>and</strong> Facebook Page.</p>
      </div>
      <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-3">
        <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-2">Preview</div>
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden max-w-sm">
          {c.image_url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.image_url} alt="" className="w-full" />}
          <div className="p-3 text-sm whitespace-pre-wrap">{c.content?.caption || 'Your caption…'}<div className="text-[#1d4ed8] mt-2 text-xs">{c.content?.hashtags}</div></div>
        </div>
      </div>
    </div>
  )
}

function ImagePicker({ value, images, onPick }: { value: string | null; images: string[]; onPick: (u: string) => void }) {
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLInputElement | null>(null)
  async function upload(file?: File | null) {
    if (!file) return
    setBusy(true)
    const fd = new FormData(); fd.append('file', file)
    try { const r = await fetch('/api/upload', { method: 'POST', body: fd }); const j = await r.json(); if (j.url) onPick(j.url); else alert(j.error || 'Upload failed') } catch { alert('Upload failed — try again') } finally { setBusy(false) }
  }
  const all = value && !images.includes(value) ? [value, ...images] : images
  return (
    <div>
      <span className={lbl}><ImageIcon size={11} className="inline mr-1" /> Image</span>
      <div className="flex gap-2 flex-wrap items-center">
        <button onClick={() => onPick('')} className={`h-12 w-12 rounded-lg border text-[10px] text-zinc-400 ${!value ? 'border-[#D72027]' : 'border-zinc-200'}`}>None</button>
        {all.map((u) => (
          // eslint-disable-next-line @next/next/no-img-element
          <button key={u} onClick={() => onPick(u)} className={`h-12 w-12 rounded-lg overflow-hidden border-2 ${value === u ? 'border-[#D72027]' : 'border-transparent'}`}><img src={u} alt="" className="h-full w-full object-cover" /></button>
        ))}
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        <button onClick={() => ref.current?.click()} disabled={busy} className="h-12 px-3 rounded-lg border-2 border-dashed border-zinc-300 text-xs font-semibold text-zinc-500 hover:border-[#D72027] hover:text-[#D72027] disabled:opacity-50">{busy ? 'Uploading…' : '⬆ Upload'}</button>
      </div>
    </div>
  )
}

function ScheduleButton({ onSchedule }: { onSchedule: (d: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative">
      <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 bg-amber-500 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-amber-600"><CalendarClock size={13} /> Schedule</button>
      {open && <span className="absolute z-10 top-full mt-1 right-0 bg-white border border-zinc-200 rounded-lg p-2 shadow-lg"><input type="datetime-local" className="text-xs border border-zinc-200 rounded px-2 py-1" onChange={(e) => { if (e.target.value) { onSchedule(new Date(e.target.value).toISOString()); setOpen(false) } }} /></span>}
    </span>
  )
}

function SetupCard({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="bg-white rounded-xl border border-amber-200 p-6 max-w-2xl">
      <h2 className="text-lg font-bold text-zinc-900 mb-2">🔧 One-time setup (30 seconds)</h2>
      <p className="text-sm text-zinc-600 mb-3">Your Campaigns home is built — it just needs its storage switched on once. Paste the code below into your Supabase SQL editor and run it, then refresh this page.</p>
      <a href="https://supabase.com/dashboard/project/dbpbfcxhbaeyoyoyllfp/sql/new" target="_blank" className="inline-block text-sm font-semibold text-[#D72027] mb-3">Open the SQL editor →</a>
      <div className="relative">
        <pre className="bg-zinc-900 text-zinc-100 text-[11px] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{sql}</pre>
        <button onClick={() => { navigator.clipboard.writeText(sql); setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="absolute top-2 right-2 inline-flex items-center gap-1 bg-white/10 text-white text-xs px-2 py-1 rounded">{copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}</button>
      </div>
    </div>
  )
}

const AUD = [
  { key: 'test', label: 'Just me (test send)', desc: 'Sends one copy to your own email so you can check it.' },
  { key: 'members', label: 'Active members', desc: 'Everyone on an active membership.' },
  { key: 'leads', label: 'Leads', desc: 'Everyone who enquired but hasn’t joined yet.' },
  { key: 'all', label: 'Everyone', desc: 'All contacts with an email address.' },
]

function SendDialog({ campaign, onClose, onSent }: { campaign: Campaign; onClose: () => void; onSent: () => void }) {
  const [audience, setAudience] = useState('test')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  async function send() {
    setBusy(true); setMsg(null)
    try {
      const r = await fetch('/api/campaigns/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: campaign.id, audience }) })
      const j = await r.json()
      if (j.ok) { setMsg(`✓ Sent to ${j.sent} ${audience === 'test' ? 'test inbox' : 'contact' + (j.sent === 1 ? '' : 's')}!`); if (audience !== 'test') onSent() }
      else setMsg(j.setup ? '⚠ Needs the analytics database switched on first.' : '⚠ ' + (j.error || 'Send failed'))
    } catch { setMsg('⚠ Could not reach the send service.') } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-zinc-900">Send “{campaign.title}”</h3><button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={18} /></button></div>
        <p className="text-xs text-zinc-500 mb-3">Who should get this newsletter? <strong>Start with a test send</strong> to check it looks right.</p>
        <div className="space-y-1.5">
          {AUD.map((a) => (
            <label key={a.key} className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer ${audience === a.key ? 'border-[#D72027] bg-red-50/40' : 'border-zinc-200'}`}>
              <input type="radio" name="aud" checked={audience === a.key} onChange={() => setAudience(a.key)} className="mt-0.5" />
              <div><div className="text-sm font-semibold text-zinc-900">{a.label}</div><div className="text-xs text-zinc-500">{a.desc}</div></div>
            </label>
          ))}
        </div>
        {msg && <p className="text-sm mt-3 font-medium text-zinc-700">{msg}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={send} disabled={busy} className="bg-[#D72027] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#A0151B] disabled:opacity-50">{busy ? 'Sending…' : 'Send now'}</button>
          <button onClick={onClose} className="text-sm text-zinc-500 px-3 py-2">Close</button>
        </div>
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 mt-3">Heads-up: free email plans cap at ~100 sends/day. For a big list we may send over a couple of days, or top up Resend.</p>
      </div>
    </div>
  )
}

function ResultsPanel({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<{ total: number; stats: Record<string, number>; recipients: { email: string; name: string | null; status: string }[]; setup?: boolean } | null>(null)
  useEffect(() => { fetch(`/api/campaigns/stats?id=${campaignId}`).then((r) => r.json()).then(setData).catch(() => setData(null)) }, [campaignId])
  if (!data) return <div className="bg-white rounded-xl border border-zinc-200 p-6 text-center text-sm text-zinc-400">Loading results…</div>
  if (data.setup) return <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">Switch on the analytics database (one-time setup) to see stats here.</div>
  const s = data.stats || {}
  const Stat = ({ label, val, sub }: { label: string; val: string; sub?: string }) => (
    <div className="bg-white rounded-xl border border-zinc-200 p-3 text-center"><div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{label}</div><div className="text-2xl font-extrabold text-zinc-900 mt-0.5">{val}</div>{sub && <div className="text-[11px] text-zinc-400">{sub}</div>}</div>
  )
  const CHIP: Record<string, string> = { sent: 'bg-zinc-100 text-zinc-600', delivered: 'bg-blue-100 text-blue-700', opened: 'bg-amber-100 text-amber-800', clicked: 'bg-emerald-100 text-emerald-700', bounced: 'bg-red-100 text-red-700', failed: 'bg-red-100 text-red-700' }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="Recipients" val={String(data.total)} />
        <Stat label="Delivered" val={`${s.deliveredPct ?? 0}%`} sub={`${s.delivered ?? 0}`} />
        <Stat label="Opened" val={`${s.openedPct ?? 0}%`} sub={`${s.opened ?? 0}`} />
        <Stat label="Clicked" val={`${s.clickedPct ?? 0}%`} sub={`${s.clicked ?? 0}`} />
      </div>
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-4 py-2 bg-zinc-50 text-[11px] font-bold uppercase tracking-wide text-zinc-400 flex justify-between"><span>Recipient</span><span>Status</span></div>
        <div className="max-h-72 overflow-y-auto">
          {data.recipients.length === 0 && <div className="px-4 py-6 text-center text-sm text-zinc-400">No recipients logged yet.</div>}
          {data.recipients.map((r, i) => (
            <div key={i} className="px-4 py-2 border-t border-zinc-100 flex items-center justify-between text-sm">
              <div className="min-w-0"><div className="font-medium text-zinc-800 truncate">{r.name || r.email}</div><div className="text-xs text-zinc-400 truncate">{r.email}</div></div>
              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${CHIP[r.status] || 'bg-zinc-100 text-zinc-500'}`}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
