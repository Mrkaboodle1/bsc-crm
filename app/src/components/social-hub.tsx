'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays, LayoutList, PenSquare, Images, Plug, Plus, Search,
  ChevronLeft, ChevronRight, Sparkles,
  Image as ImageIcon, MoreHorizontal, Trash2, Clock, Send, FileText, Link2, Check,
} from 'lucide-react'

export type SocialPost = {
  id: string
  caption: string | null
  media_url: string | null
  media_kind: string | null
  platform: string | null
  status: 'draft' | 'scheduled' | 'posted' | 'failed' | 'deleted'
  posted_at: string | null
  scheduled_for: string | null
  created_at: string | null
  reach: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
}
export type MediaItem = { id: string; url: string | null; alt: string | null; kind: string | null }

type ChannelDef = { label: string; mono: string; fg: string; bg: string }
const CHANNELS: Record<string, ChannelDef> = {
  instagram: { label: 'Instagram', mono: 'IG', fg: 'text-pink-600', bg: 'bg-pink-50' },
  facebook:  { label: 'Facebook',  mono: 'FB', fg: 'text-blue-600', bg: 'bg-blue-50' },
  linkedin:  { label: 'LinkedIn',  mono: 'in', fg: 'text-sky-700',  bg: 'bg-sky-50' },
  tiktok:    { label: 'TikTok',    mono: 'TT', fg: 'text-zinc-800', bg: 'bg-zinc-100' },
  threads:   { label: 'Threads',   mono: '@',  fg: 'text-zinc-800', bg: 'bg-zinc-100' },
}
const STATUS: Record<string, { label: string; dot: string; cls: string }> = {
  posted:    { label: 'Published', dot: 'bg-emerald-500', cls: 'text-emerald-700 bg-emerald-50 ring-emerald-200' },
  scheduled: { label: 'Scheduled', dot: 'bg-blue-500',    cls: 'text-blue-700 bg-blue-50 ring-blue-200' },
  draft:     { label: 'Draft',     dot: 'bg-zinc-400',    cls: 'text-zinc-600 bg-zinc-100 ring-zinc-200' },
  failed:    { label: 'Failed',    dot: 'bg-red-500',     cls: 'text-red-700 bg-red-50 ring-red-200' },
}
const PLATFORMS = ['instagram', 'facebook', 'linkedin', 'tiktok', 'threads'] as const

function ChannelBadge({ platform, small }: { platform: string | null; small?: boolean }) {
  const c = platform ? CHANNELS[platform] : null
  if (!c) return <span className="text-zinc-300">—</span>
  return (
    <span title={c.label} className={`inline-flex items-center justify-center rounded-full ${small ? 'w-5 h-5' : 'w-7 h-7'} ${c.bg} ${c.fg} ring-1 ring-inset ring-black/5`}>
      <span className={small ? 'text-[8px] font-bold' : 'text-[10px] font-bold'}>{c.mono}</span>
    </span>
  )
}
function StatusPill({ status }: { status: string }) {
  const s = STATUS[status] || STATUS.draft
  return <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ring-inset ${s.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}</span>
}
const postDate = (p: SocialPost) => p.scheduled_for || p.posted_at || p.created_at
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const fmtDateTime = (d: string | null) => (d ? new Date(d).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—')
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const TABS = [
  { key: 'calendar', label: 'Calendar', Icon: CalendarDays },
  { key: 'posts', label: 'Posts', Icon: LayoutList },
  { key: 'create', label: 'Create Post', Icon: PenSquare },
  { key: 'library', label: 'Library', Icon: Images },
  { key: 'accounts', label: 'Accounts', Icon: Plug },
] as const
type TabKey = (typeof TABS)[number]['key']

export function SocialHub({ posts, media }: { posts: SocialPost[]; media: MediaItem[] }) {
  const [tab, setTab] = useState<TabKey>('calendar')
  return (
    <div>
      <nav className="flex items-center gap-1 border-b border-zinc-200 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === t.key ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}>
            <t.Icon size={16} />{t.label}
          </button>
        ))}
      </nav>
      {tab === 'calendar' && <CalendarTab posts={posts} onCreate={() => setTab('create')} />}
      {tab === 'posts' && <PostsTab posts={posts} onCreate={() => setTab('create')} />}
      {tab === 'create' && <CreateTab onDone={() => setTab('calendar')} />}
      {tab === 'library' && <LibraryTab media={media} />}
      {tab === 'accounts' && <AccountsTab />}
    </div>
  )
}

/* ---------------- Calendar ---------------- */
function CalendarTab({ posts, onCreate }: { posts: SocialPost[]; onCreate: () => void }) {
  const today = new Date()
  const [anchor, setAnchor] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const byDay = useMemo(() => {
    const map: Record<string, SocialPost[]> = {}
    for (const p of posts) { const d = postDate(p); if (!d) continue; const k = dayKey(new Date(d)); (map[k] ||= []).push(p) }
    return map
  }, [posts])
  const upcoming = useMemo(() => posts
    .filter((p) => p.status === 'scheduled' && p.scheduled_for && new Date(p.scheduled_for) >= new Date(today.toDateString()))
    .sort((a, b) => +new Date(a.scheduled_for!) - +new Date(b.scheduled_for!)).slice(0, 6), [posts]) // eslint-disable-line react-hooks/exhaustive-deps

  const first = new Date(anchor.y, anchor.m, 1)
  const startPad = first.getDay()
  const days = new Date(anchor.y, anchor.m + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const monthName = first.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
  const move = (d: number) => setAnchor((a) => { const nd = new Date(a.y, a.m + d, 1); return { y: nd.getFullYear(), m: nd.getMonth() } })

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-5">
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <h3 className="font-semibold text-zinc-900">{monthName}</h3>
          <div className="flex items-center gap-1">
            <button onClick={() => move(-1)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500"><ChevronLeft size={18} /></button>
            <button onClick={() => setAnchor({ y: today.getFullYear(), m: today.getMonth() })} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600">Today</button>
            <button onClick={() => move(1)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500"><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-[11px] font-semibold text-zinc-400 px-2 pt-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="px-2 py-1 text-center">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 p-2">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const k = dayKey(new Date(anchor.y, anchor.m, day))
            const dayPosts = byDay[k] || []
            const isToday = k === dayKey(today)
            return (
              <div key={i} className={`min-h-[78px] rounded-lg border p-1.5 ${isToday ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-100'}`}>
                <div className={`text-[11px] font-semibold mb-1 ${isToday ? 'text-zinc-900' : 'text-zinc-400'}`}>{day}</div>
                <div className="space-y-1">
                  {dayPosts.slice(0, 3).map((p) => (
                    <div key={p.id} className="flex items-center gap-1 text-[10px] bg-zinc-50 rounded px-1 py-0.5 border border-zinc-100">
                      <ChannelBadge platform={p.platform} small />
                      <span className="truncate text-zinc-600">{(p.caption || '').replace(/[^\w\s&!,'-]/g, '').slice(0, 18) || 'Post'}</span>
                    </div>
                  ))}
                  {dayPosts.length > 3 && <div className="text-[10px] text-zinc-400 px-1">+{dayPosts.length - 3} more</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="space-y-4">
        <button onClick={onCreate} className="w-full inline-flex items-center justify-center gap-2 bg-zinc-900 text-white font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-800"><Plus size={16} /> Create post</button>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wide text-zinc-400 mb-3">Upcoming</h4>
          {upcoming.length === 0 ? <p className="text-sm text-zinc-400">No scheduled posts yet.</p> : (
            <ul className="space-y-3">
              {upcoming.map((p) => (
                <li key={p.id} className="flex gap-2.5">
                  <ChannelBadge platform={p.platform} />
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-800 truncate font-medium">{p.caption || 'Post'}</div>
                    <div className="text-xs text-zinc-400 flex items-center gap-1"><Clock size={11} /> {fmtDateTime(p.scheduled_for)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------------- Posts (list) ---------------- */
function PostsTab({ posts, onCreate }: { posts: SocialPost[]; onCreate: () => void }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [menu, setMenu] = useState<string | null>(null)
  const filtered = posts.filter((p) => (status === 'all' || p.status === status) && (!search.trim() || (p.caption || '').toLowerCase().includes(search.toLowerCase())))
  async function del(id: string) { setMenu(null); await fetch('/api/social/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); router.refresh() }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts" className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none" />
        </div>
        <div className="flex gap-1">
          {[['all', 'All'], ['posted', 'Published'], ['scheduled', 'Scheduled'], ['draft', 'Draft'], ['failed', 'Failed']].map(([k, l]) => (
            <button key={k} onClick={() => setStatus(k)} className={`text-xs font-semibold px-3 py-2 rounded-lg ${status === k ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>{l}</button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-14 text-center">
          <FileText size={32} className="mx-auto text-zinc-300 mb-3" />
          <h3 className="font-semibold text-zinc-800 mb-1">No posts here</h3>
          <p className="text-sm text-zinc-500 mb-5">Create a post to see it listed and scheduled.</p>
          <button onClick={onCreate} className="inline-flex items-center gap-2 bg-zinc-900 text-white font-semibold px-4 py-2.5 rounded-lg text-sm"><Plus size={16} /> Create post</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wide text-zinc-400 border-b border-zinc-100">
              <th className="px-4 py-3 font-semibold">Post</th><th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold">Channel</th><th className="px-3 py-3 font-semibold">Date</th><th className="px-3 py-3"></th>
            </tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-zinc-50 hover:bg-zinc-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 max-w-[460px]">
                      {p.media_url ? <img src={p.media_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-zinc-200 shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0"><ImageIcon size={16} className="text-zinc-400" /></div>}
                      <span className="text-zinc-800 font-medium truncate">{p.caption || '(no caption)'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3"><StatusPill status={p.status} /></td>
                  <td className="px-3 py-3"><ChannelBadge platform={p.platform} /></td>
                  <td className="px-3 py-3 text-zinc-600 whitespace-nowrap">{fmtDate(postDate(p))}</td>
                  <td className="px-3 py-3 relative">
                    <button onClick={() => setMenu(menu === p.id ? null : p.id)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"><MoreHorizontal size={16} /></button>
                    {menu === p.id && (
                      <div className="absolute right-2 top-9 z-10 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 w-32">
                        <button onClick={() => del(p.id)} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={14} /> Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ---------------- Create ---------------- */
function CreateTab({ onDone }: { onDone: () => void }) {
  const router = useRouter()
  const [caption, setCaption] = useState('')
  const [channels, setChannels] = useState<string[]>(['instagram', 'facebook'])
  const [mediaUrl, setMediaUrl] = useState('')
  const [when, setWhen] = useState<'now' | 'schedule' | 'draft'>('schedule')
  const [scheduledFor, setScheduledFor] = useState('')
  const [busy, setBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [err, setErr] = useState('')

  const toggle = (p: string) => setChannels((c) => c.includes(p) ? c.filter((x) => x !== p) : [...c, p])

  async function writeAI() {
    setAiBusy(true); setErr('')
    try {
      const r = await fetch('/api/ai-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: 'social', prompt: caption || 'a fun update about our circus classes', platform: channels[0] || 'instagram', tone: 'friendly' }) })
      const j = await r.json()
      const text = j.text || (Array.isArray(j.variants) && j.variants[0]) || ''
      if (text) setCaption(text)
    } catch { /* ignore */ } finally { setAiBusy(false) }
  }
  function genImage() {
    const prompt = caption.slice(0, 200) || 'kids circus class, bright, joyful, professional photo'
    setMediaUrl(`/api/ai-image?prompt=${encodeURIComponent(prompt)}&seed=${Math.floor(Math.random() * 99999)}&width=1080&height=1080`)
  }
  async function submit() {
    setErr(''); setBusy(true)
    try {
      const r = await fetch('/api/social/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caption, platforms: channels, mediaUrl: mediaUrl || null, when, scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Could not save')
      router.refresh(); onDone()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save') } finally { setBusy(false) }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-5 max-w-4xl">
      <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-5">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-zinc-500">Caption</label>
            <button onClick={writeAI} disabled={aiBusy} className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 disabled:opacity-50"><Sparkles size={13} /> {aiBusy ? 'Writing…' : 'Write with AI'}</button>
          </div>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={6} placeholder="What do you want to post?" className="w-full px-3.5 py-3 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none resize-none" />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1.5 block">Channels</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => {
              const on = channels.includes(p); const c = CHANNELS[p]
              return (
                <button key={p} onClick={() => toggle(p)} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${on ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
                  <span className="text-xs font-bold w-5 text-center">{c.mono}</span>{c.label}{on && <Check size={14} />}
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1.5 block">When</label>
          <div className="flex gap-2 mb-3">
            {([['schedule', 'Schedule', Clock], ['now', 'Post now', Send], ['draft', 'Save draft', FileText]] as const).map(([k, l, Ic]) => (
              <button key={k} onClick={() => setWhen(k)} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${when === k ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}><Ic size={15} />{l}</button>
            ))}
          </div>
          {when === 'schedule' && <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="px-3.5 py-2.5 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none" />}
        </div>
        {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{err}</div>}
        <div className="flex items-center gap-3 pt-1">
          <button onClick={submit} disabled={busy} className="inline-flex items-center gap-2 bg-zinc-900 text-white font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-50">{busy ? 'Saving…' : when === 'now' ? 'Publish' : when === 'schedule' ? 'Schedule post' : 'Save draft'}</button>
          <button onClick={onDone} className="text-sm font-semibold text-zinc-500 hover:text-zinc-800">Cancel</button>
        </div>
      </div>
      {/* Preview / media */}
      <div className="space-y-3">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wide text-zinc-500">Image</label>
            <button onClick={genImage} className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900"><Sparkles size={13} /> Generate</button>
          </div>
          {mediaUrl ? <img src={mediaUrl} alt="" className="w-full aspect-square object-cover rounded-lg border border-zinc-200" /> : <div className="w-full aspect-square rounded-lg bg-zinc-50 border border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400"><ImageIcon size={28} /><span className="text-xs mt-2">No image</span></div>}
          <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="…or paste an image URL" className="w-full mt-2 px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:border-zinc-900 focus:outline-none" />
        </div>
      </div>
    </div>
  )
}

/* ---------------- Library ---------------- */
function LibraryTab({ media }: { media: MediaItem[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-zinc-500">Images you upload or generate, ready to drop into posts.</p>
        <a href="/media" className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"><Plus size={16} /> Add media</a>
      </div>
      {media.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-14 text-center">
          <Images size={32} className="mx-auto text-zinc-300 mb-3" />
          <h3 className="font-semibold text-zinc-800 mb-1">No media yet</h3>
          <p className="text-sm text-zinc-500">Upload images or generate them with AI to build your library.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {media.map((m) => (
            <div key={m.id} className="aspect-square rounded-lg border border-zinc-200 overflow-hidden bg-zinc-50">
              {m.url ? <img src={m.url} alt={m.alt || ''} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={20} className="text-zinc-300" /></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------------- Accounts ---------------- */
function AccountsTab() {
  const accounts = [
    { key: 'instagram', desc: 'Publish photos, carousels & reels' },
    { key: 'facebook', desc: 'Publish posts to your Page' },
    { key: 'tiktok', desc: 'Schedule short-form video' },
    { key: 'threads', desc: 'Publish text & images' },
    { key: 'linkedin', desc: 'Share to your company page' },
  ]
  return (
    <div className="max-w-2xl">
      <p className="text-sm text-zinc-500 mb-4">Connect each channel once. After that, scheduled posts publish automatically.</p>
      <div className="space-y-2.5">
        {accounts.map((a) => {
          const c = CHANNELS[a.key]
          return (
            <div key={a.key} className="flex items-center gap-3 bg-white rounded-xl border border-zinc-200 px-4 py-3">
              <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${c.bg} ${c.fg}`}><span className="text-sm font-bold">{c.mono}</span></span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-zinc-900">{c.label}</div>
                <div className="text-xs text-zinc-500">{a.desc}</div>
              </div>
              <span className="text-xs font-semibold text-zinc-400 mr-1">Not connected</span>
              <button className="inline-flex items-center gap-1.5 bg-zinc-900 text-white font-semibold text-sm px-3.5 py-2 rounded-lg hover:bg-zinc-800"><Link2 size={15} /> Connect</button>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-zinc-400 mt-4">Connecting Instagram & Facebook uses your Meta Business account. Jacky will walk you through it when you tap Connect.</p>
    </div>
  )
}
