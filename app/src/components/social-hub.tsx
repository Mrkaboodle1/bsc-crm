'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays, LayoutList, PenSquare, Images, Plug, Plus, Search,
  ChevronLeft, ChevronRight, Sparkles, Upload,
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
const isVideoUrl = (u: string | null) => !!u && (/\.(mp4|mov|m4v|webm)(\?|$)/i.test(u) || u.includes('cdn-video.vizard'))
const vizardEditLink = (caption: string | null): string | null => { const m = (caption || '').match(/https:\/\/vizard\.ai\/editor[^\s]+/i); return m ? m[0] : null }
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const vizPct = (s: number) => Math.min(95, Math.round((s / 360) * 100)) // time-based estimate (~6 min), capped at 95% until done
const vizStage = (s: number) => s < 15 ? 'Uploading to Vizard…' : s < 60 ? 'Processing your video…' : s < 180 ? 'Finding the best moments…' : 'Almost there — writing your posts…'

const TABS = [
  { key: 'calendar', label: 'Calendar', Icon: CalendarDays },
  { key: 'posts', label: 'Posts', Icon: LayoutList },
  { key: 'create', label: 'Create Post', Icon: PenSquare },
  { key: 'factory', label: 'Content Factory', Icon: Sparkles },
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
      {tab === 'factory' && <FactoryTab onDone={() => setTab('calendar')} />}
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
  const [editing, setEditing] = useState<SocialPost | null>(null)
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
                      {p.media_url ? (isVideoUrl(p.media_url) ? <video src={p.media_url} muted playsInline className="w-10 h-10 rounded-lg object-cover border border-zinc-200 shrink-0 bg-black" /> : <img src={p.media_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-zinc-200 shrink-0" />) : <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0"><ImageIcon size={16} className="text-zinc-400" /></div>}
                      <span className="text-zinc-800 font-medium truncate">{p.caption || '(no caption)'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3"><StatusPill status={p.status} /></td>
                  <td className="px-3 py-3"><ChannelBadge platform={p.platform} /></td>
                  <td className="px-3 py-3 text-zinc-600 whitespace-nowrap">{fmtDate(postDate(p))}</td>
                  <td className="px-3 py-3 relative">
                    <button onClick={() => setMenu(menu === p.id ? null : p.id)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"><MoreHorizontal size={16} /></button>
                    {menu === p.id && (
                      <div className="absolute right-2 top-9 z-10 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 w-44">
                        <button onClick={() => { setMenu(null); setEditing(p) }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"><PenSquare size={14} /> Edit</button>
                        {vizardEditLink(p.caption) && <a href={vizardEditLink(p.caption)!} target="_blank" rel="noopener noreferrer" onClick={() => setMenu(null)} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"><Link2 size={14} /> Edit in Vizard ↗</a>}
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
      {editing && <EditPostModal post={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh() }} />}
    </div>
  )
}

/* ---------------- Edit post ---------------- */
const EDIT_PLATFORMS = ['instagram', 'facebook', 'tiktok', 'threads'] as const
function EditPostModal({ post, onClose, onSaved }: { post: SocialPost; onClose: () => void; onSaved: () => void }) {
  const [caption, setCaption] = useState(post.caption ?? '')
  const [mediaUrl, setMediaUrl] = useState(post.media_url ?? '')
  const [platforms, setPlatforms] = useState<string[]>(post.platform ? [post.platform] : ['instagram'])
  const toLocal = (iso: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  const [scheduledFor, setScheduledFor] = useState(toLocal(post.scheduled_for))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const isPosted = post.status === 'posted'
  const editLink = vizardEditLink(post.caption)
  const togglePlatform = (p: string) => setPlatforms((c) => c.includes(p) ? c.filter((x) => x !== p) : [...c, p])

  // Thumbnail maker — uses the CRM's connected free image AI (Pollinations) or an upload.
  const [thumb, setThumb] = useState('')
  const [thumbBusy, setThumbBusy] = useState(false)
  const [thumbErr, setThumbErr] = useState('')
  const [thumbPrompt, setThumbPrompt] = useState('')
  const thumbFileRef = useRef<HTMLInputElement | null>(null)
  async function aiCover() {
    setThumbErr(''); setThumbBusy(true)
    try {
      const typed = thumbPrompt.trim()
      const auto = (caption.split('\n').find((l) => l.trim()) || 'BigStar Circus kids').replace(/[#🎬💬⭐🔗•—]/g, '').trim().slice(0, 200)
      const prompt = typed
        ? `${typed}. Bright, high-energy, eye-catching thumbnail. Any text must be spelled correctly.`
        : `${auto}. Bold, vibrant, eye-catching thumbnail for a kids circus school on the Gold Coast, Australia. High energy, professional, punchy.`
      const r = await fetch('/api/social/thumbnail-ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Could not generate')
      setThumb(j.url)
    } catch (e) { setThumbErr(e instanceof Error ? e.message : 'Could not generate') } finally { setThumbBusy(false) }
  }
  async function uploadThumb(file?: File | null) {
    if (!file) return
    setThumbBusy(true); setThumbErr('')
    const fd = new FormData(); fd.append('file', file)
    try { const r = await fetch('/api/upload', { method: 'POST', body: fd }); const j = await r.json(); if (j.url) setThumb(j.url); else setThumbErr(j.error || 'Upload failed') }
    catch { setThumbErr('Upload failed — try again') } finally { setThumbBusy(false) }
  }

  async function save() {
    if (platforms.length === 0) { setErr('Pick at least one platform.'); return }
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/social/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: post.id, caption, mediaUrl: mediaUrl || null, platforms,
          ...(isPosted ? {} : { scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null }),
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Could not save')
      onSaved()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save'); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 sticky top-0 bg-white z-10">
          <h3 className="font-extrabold text-zinc-900 text-lg">Edit post</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-2xl leading-none">×</button>
        </div>
        <div className="grid md:grid-cols-2 gap-5 p-5">
          {/* Left: the clip */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wide text-zinc-500 block">Video / image</label>
            {mediaUrl ? (isVideoUrl(mediaUrl)
              ? <video src={mediaUrl} controls playsInline className="w-full rounded-xl border border-zinc-200 bg-black" />
              : <img src={mediaUrl} alt="" className="w-full rounded-xl border border-zinc-200 object-cover" />)
              : <div className="w-full aspect-video rounded-xl bg-zinc-50 border-2 border-dashed border-zinc-200 flex items-center justify-center text-zinc-400 text-sm">No video/image attached</div>}
            <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="Paste a video or image URL" className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:border-zinc-900 focus:outline-none" />
            {editLink && <a href={editLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#D72027] hover:underline"><Link2 size={15} /> Edit music / video / timing in Vizard ↗</a>}

            <div className="pt-3 border-t border-zinc-100">
              <label className="text-xs font-bold uppercase tracking-wide text-zinc-500 block mb-1.5">Thumbnail maker</label>
              <textarea value={thumbPrompt} onChange={(e) => setThumbPrompt(e.target.value)} rows={2} placeholder="Describe the thumbnail you want (e.g. 'young girl mid-air on aerial silks, huge smile, bright circus tent behind her, bold yellow text: HER FIRST DROP'). Leave blank and I'll write it from the caption." className="w-full mb-2 px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:border-zinc-900 focus:outline-none resize-none" />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={aiCover} disabled={thumbBusy} className="inline-flex items-center gap-1.5 bg-zinc-900 text-white font-semibold px-3 py-2 rounded-lg text-xs hover:bg-zinc-800 disabled:opacity-50"><Sparkles size={13} /> {thumbBusy ? 'Generating…' : 'Generate cover (AI)'}</button>
                <button type="button" onClick={() => thumbFileRef.current?.click()} disabled={thumbBusy} className="inline-flex items-center gap-1.5 bg-white border border-zinc-300 text-zinc-700 font-semibold px-3 py-2 rounded-lg text-xs hover:bg-zinc-50 disabled:opacity-50"><Upload size={13} /> {thumbBusy ? 'Uploading…' : 'Upload own'}</button>
                <input ref={thumbFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadThumb(e.target.files?.[0])} />
              </div>
              {thumb && (
                <div className="mt-2">
                  <img src={thumb} alt="thumbnail" className="w-full rounded-lg border border-zinc-200 bg-zinc-50" />
                  <div className="flex items-center gap-3 mt-1.5">
                    <a href={thumb} download="bigstar-thumbnail.jpg" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#D72027] hover:underline">Download</a>
                    <button type="button" onClick={() => setMediaUrl(thumb)} className="text-xs font-semibold text-zinc-600 hover:underline">Use as post image</button>
                  </div>
                </div>
              )}
              {thumbErr && <p className="text-[11px] text-red-600 mt-1">{thumbErr}</p>}
              <p className="text-[11px] text-zinc-400 mt-1.5">AI cover via OpenAI (a few cents each — better quality than the free option). For the exact frame from your clip, use &ldquo;Edit in Vizard&rdquo; above and set the cover there.</p>
            </div>
          </div>
          {/* Right: text + options */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1.5 block">Caption</label>
              <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={10} className="w-full px-3.5 py-3 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none resize-y" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1.5 block">Post to</label>
              <div className="flex flex-wrap gap-2">
                {EDIT_PLATFORMS.map((p) => { const on = platforms.includes(p); const c = CHANNELS[p]; return (
                  <button key={p} type="button" onClick={() => togglePlatform(p)} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${on ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
                    <span className="text-xs font-bold w-5 text-center">{c.mono}</span>{c.label}{on && <Check size={14} />}
                  </button>
                ) })}
              </div>
              {platforms.length > 1 && <p className="text-[11px] text-zinc-400 mt-1">Saving creates a copy for each extra platform.</p>}
            </div>
            {!isPosted && (
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1.5 block">Schedule for (optional)</label>
                <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="px-3.5 py-2.5 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none" />
                <p className="text-[11px] text-zinc-400 mt-1">Leave blank to keep it a draft.</p>
              </div>
            )}
            {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{err}</div>}
          </div>
        </div>
        <div className="flex items-center gap-3 p-5 border-t border-zinc-100 sticky bottom-0 bg-white">
          <button onClick={save} disabled={busy} className="bg-zinc-900 text-white font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50">{busy ? 'Saving…' : 'Save changes'}</button>
          <button onClick={onClose} className="text-sm font-semibold text-zinc-500 hover:text-zinc-800">Cancel</button>
        </div>
      </div>
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
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  async function uploadImage(file?: File | null) {
    if (!file) return
    setUploading(true); setErr('')
    const fd = new FormData(); fd.append('file', file)
    try { const r = await fetch('/api/upload', { method: 'POST', body: fd }); const j = await r.json(); if (j.url) setMediaUrl(j.url); else setErr(j.error || 'Upload failed') }
    catch { setErr('Upload failed — try again') } finally { setUploading(false) }
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
            <div className="flex items-center gap-3">
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D72027] hover:text-[#A0151B] disabled:opacity-50"><Upload size={13} /> {uploading ? 'Uploading…' : 'Upload'}</button>
              <button onClick={genImage} className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900"><Sparkles size={13} /> Generate</button>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0])} />
          {mediaUrl ? <img src={mediaUrl} alt="" className="w-full aspect-square object-cover rounded-lg border border-zinc-200" /> : <button onClick={() => fileRef.current?.click()} className="w-full aspect-square rounded-lg bg-zinc-50 border-2 border-dashed border-zinc-200 hover:border-[#D72027] hover:text-[#D72027] flex flex-col items-center justify-center text-zinc-400 cursor-pointer"><Upload size={28} /><span className="text-xs mt-2 font-semibold">{uploading ? 'Uploading…' : 'Tap to upload a photo'}</span></button>}
          <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="…or paste an image URL" className="w-full mt-2 px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:border-zinc-900 focus:outline-none" />
        </div>
      </div>
    </div>
  )
}

/* ---------------- Content Factory ---------------- */
type FactoryPost = { brand: string; platform: string; hook: string; caption: string; hashtags: string[]; firstComment: string; clipIdea: string; videoUrl?: string; editorUrl?: string; viralScore?: string | number; viralReason?: string }
type TvClip = { publicPath: string; hook: string; cta: string; viralScore: number; brand: string; platform: string; whatHappens: string; caption: string; sourcePath: string; start: number; end: number }
type ReviewState = { keep: boolean; platforms: string[]; when: string; feedback: string; vibe: string; busy: boolean; saved: boolean }

function FactoryTab({ onDone }: { onDone: () => void }) {
  const router = useRouter()
  const [brief, setBrief] = useState('')
  const [brands, setBrands] = useState<string[]>(['BSC TV', 'RhettStar'])
  const [count, setCount] = useState(10)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [result, setResult] = useState<FactoryPost[] | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [projectLink, setProjectLink] = useState('')
  const [tvPath, setTvPath] = useState('')
  const [tvAudio, setTvAudio] = useState<'original' | 'music' | 'both'>('music')
  const [tvVibe, setTvVibe] = useState('')
  const [musicBusy, setMusicBusy] = useState(false)
  const [musicMsg, setMusicMsg] = useState('')
  const [musicCount, setMusicCount] = useState(0)

  async function loadMusicCount() {
    try { const r = await fetch('/api/social/bigstar-tv/music'); const j = await r.json(); if (Array.isArray(j.tracks)) setMusicCount(j.tracks.length) } catch { /* ignore */ }
  }
  useEffect(() => { loadMusicCount() }, [])

  // Fetch commercially-safe royalty-free tracks matching the vibe.
  async function findMusic() {
    if (!tvVibe.trim()) { setMusicMsg('Type a music vibe first, e.g. "energetic circus fun".'); return }
    setMusicBusy(true); setMusicMsg('')
    try {
      const r = await fetch('/api/social/bigstar-tv/music', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vibe: tvVibe.trim(), count: 4 }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Could not find music')
      setMusicCount(Array.isArray(j.tracks) ? j.tracks.length : musicCount + j.added)
      setMusicMsg(`✅ Added ${j.added} track${j.added > 1 ? 's' : ''} — credit the artists (see CREDITS.txt).`)
    } catch (e) { setMusicMsg(e instanceof Error ? e.message : 'Could not find music') } finally { setMusicBusy(false) }
  }
  const [tvGoal, setTvGoal] = useState('')
  const [tvCta, setTvCta] = useState('')
  const [tvLength, setTvLength] = useState<'short' | 'medium' | 'long'>('medium')
  const [tvClips, setTvClips] = useState(4)
  const [tv, setTv] = useState<{ status: 'idle' | 'running' | 'done' | 'error'; msg?: string; clips?: TvClip[] }>({ status: 'idle' })
  // Per-clip review state: ticked, platforms, schedule, feedback, busy/saved.
  const [review, setReview] = useState<Record<number, ReviewState>>({})
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const rv = (i: number): ReviewState => review[i] ?? { keep: false, platforms: [], when: '', feedback: '', vibe: '', busy: false, saved: false }
  const setRv = (i: number, patch: Partial<ReviewState>) => setReview((r) => ({ ...r, [i]: { ...rv(i), ...patch } }))

  async function redoClip(i: number) {
    const c = tv.clips?.[i]
    if (!c) return
    setRv(i, { busy: true })
    try {
      const r = await fetch('/api/social/bigstar-tv/redo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...c, feedback: rv(i).feedback, musicVibe: rv(i).vibe || tvVibe, audioMode: tvAudio, goal: tvGoal }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Could not re-make it')
      setTv((t) => ({ ...t, clips: t.clips?.map((x, n) => (n === i ? j.clip : x)) }))
      setRv(i, { busy: false, feedback: '' })
    } catch (e) { setRv(i, { busy: false }); setErr(e instanceof Error ? e.message : 'Could not re-make it') }
  }

  async function saveSelected() {
    const picked = (tv.clips ?? []).map((c, i) => ({ c, i })).filter(({ i }) => rv(i).keep && !rv(i).saved)
    if (!picked.length) { setErr('Tick the clips you want to keep first.'); return }
    setSaving(true); setErr(''); setSavedMsg('')
    try {
      const r = await fetch('/api/social/bigstar-tv/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clips: picked.map(({ c, i }) => ({
            publicPath: c.publicPath,
            caption: c.caption,
            platforms: rv(i).platforms.length ? rv(i).platforms : [c.platform],
            scheduledFor: rv(i).when ? new Date(rv(i).when).toISOString() : null,
          })),
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Could not save')
      picked.forEach(({ i }) => setRv(i, { saved: true }))
      setSavedMsg(`✅ Saved ${j.created} post${j.created > 1 ? 's' : ''} — check your Calendar.`)
      router.refresh()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save') } finally { setSaving(false) }
  }
  const [tvElapsed, setTvElapsed] = useState(0)
  const tvTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const [tvVideos, setTvVideos] = useState<Array<{ path: string; label: string }>>([])
  const [tvListing, setTvListing] = useState(false)
  const [tvPreview, setTvPreview] = useState('')      // blob: URL for the picked file
  const [tvPickedName, setTvPickedName] = useState('')
  const tvFileRef = useRef<HTMLInputElement | null>(null)

  // The queue of videos to process this run (one filming day can be many files).
  const [tvQueue, setTvQueue] = useState<string[]>([])
  const addToQueue = (p: string) => setTvQueue((q) => (p && !q.includes(p) && q.length < 8 ? [...q, p] : q))
  const removeFromQueue = (p: string) => setTvQueue((q) => q.filter((x) => x !== p))

  // "Add from device" — opens the real file picker (multi-select allowed).
  // Browsers hide the true disk path for security, so we match each pick to the
  // scanned list by filename to get the path the engine needs.
  function pickFromDevice(files?: FileList | null) {
    if (!files?.length) return
    setErr('')
    const missing: string[] = []
    for (const f of Array.from(files)) {
      const match = tvVideos.find((v) => v.path.split(/[\\/]/).pop() === f.name)
      if (match) addToQueue(match.path)
      else missing.push(f.name)
    }
    const first = Array.from(files)[0]
    setTvPickedName(first.name)
    setTvPreview((old) => { if (old.startsWith('blob:')) URL.revokeObjectURL(old); return URL.createObjectURL(first) })
    if (missing.length) setErr(`Couldn’t locate ${missing.length === 1 ? `"${missing[0]}"` : `${missing.length} files`} on disk — pick from the list instead, or paste the path below.`)
  }

  // Preview whatever is chosen in the dropdown, straight from the local server.
  function previewFromList(p: string) {
    if (!p) return
    addToQueue(p)
    setTvPickedName(p.split(/[\\/]/).pop() || '')
    setTvPreview((old) => { if (old.startsWith('blob:')) URL.revokeObjectURL(old); return `/api/social/bigstar-tv/preview?path=${encodeURIComponent(p)}` })
  }

  async function loadMyVideos() {
    setTvListing(true)
    try {
      const r = await fetch('/api/social/bigstar-tv/videos')
      const j = await r.json()
      if (Array.isArray(j.videos)) setTvVideos(j.videos)
    } catch { /* fall back to typing a path */ } finally { setTvListing(false) }
  }
  useEffect(() => { loadMyVideos() }, [])
  const [viz, setViz] = useState<{ status: 'idle' | 'submitting' | 'processing' | 'done' | 'error'; msg?: string; created?: number }>({ status: 'idle' })
  const [elapsed, setElapsed] = useState(0)
  const vizPoll = useRef<ReturnType<typeof setTimeout> | null>(null)
  const vizTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const toggleBrand = (b: string) => setBrands((cur) => cur.includes(b) ? cur.filter((x) => x !== b) : [...cur, b])

  async function generate() {
    if (!brief.trim()) { setErr('Tell me what happened on filming day first.'); return }
    if (brands.length === 0) { setErr('Pick at least one brand.'); return }
    setBusy(true); setErr(''); setResult(null)
    try {
      const r = await fetch('/api/social/factory', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, brands, count }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Could not generate posts')
      setResult((j.posts as FactoryPost[]) || [])
      router.refresh()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not generate posts') } finally { setBusy(false) }
  }

  function pollVizard(projectId: string | number) {
    vizPoll.current = setTimeout(async () => {
      try {
        const r = await fetch('/api/social/vizard/clips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, brands, count }) })
        const j = await r.json()
        if (!r.ok) throw new Error(j.error || 'Vizard error')
        if (j.status === 'processing') { pollVizard(projectId); return }
        if (vizTimer.current) clearInterval(vizTimer.current)
        setViz({ status: 'done', created: j.created ?? (j.clips?.length || 0) })
        if (Array.isArray(j.posts)) setResult(j.posts as FactoryPost[])
        router.refresh()
      } catch (e) { if (vizTimer.current) clearInterval(vizTimer.current); setViz({ status: 'error', msg: e instanceof Error ? e.message : 'Vizard error' }) }
    }, 20000)
  }

  async function sendToVizard() {
    if (!videoUrl.trim()) { setErr('Paste a video link first.'); return }
    setErr(''); setViz({ status: 'submitting' })
    try {
      const r = await fetch('/api/social/vizard/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoUrl }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Could not send to Vizard')
      setViz({ status: 'processing', msg: 'Vizard is cutting your video…' })
      const start = Date.now()
      setElapsed(0)
      if (vizTimer.current) clearInterval(vizTimer.current)
      vizTimer.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
      pollVizard(j.projectId)
    } catch (e) { setViz({ status: 'error', msg: e instanceof Error ? e.message : 'Could not send to Vizard' }) }
  }

  async function importFromVizard() {
    const m = projectLink.match(/(\d{5,})/)
    if (!m) { setErr('Paste a Vizard project link (it has a number in it, e.g. vizard.ai/project/123456).'); return }
    const projectId = m[1]
    setErr(''); setViz({ status: 'processing', msg: 'Fetching your Vizard clips…' })
    const start = Date.now(); setElapsed(0)
    if (vizTimer.current) clearInterval(vizTimer.current)
    vizTimer.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    try {
      const r = await fetch('/api/social/vizard/clips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, brands }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Vizard error')
      if (j.status === 'processing') { pollVizard(projectId); return }
      if (vizTimer.current) clearInterval(vizTimer.current)
      setViz({ status: 'done', created: j.created ?? (j.clips?.length || 0) })
      if (Array.isArray(j.posts)) setResult(j.posts as FactoryPost[])
      router.refresh()
    } catch (e) { if (vizTimer.current) clearInterval(vizTimer.current); setViz({ status: 'error', msg: e instanceof Error ? e.message : 'Vizard error' }) }
  }

  async function runBigStarTV() {
    const paths = tvQueue.length ? tvQueue : (tvPath.trim() ? [tvPath.trim()] : [])
    if (!paths.length) { setErr('Add at least one video first.'); return }
    setErr(''); setTv({ status: 'running' }); setTvElapsed(0)
    const start = Date.now()
    if (tvTimer.current) clearInterval(tvTimer.current)
    tvTimer.current = setInterval(() => setTvElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    try {
      const r = await fetch('/api/social/bigstar-tv', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: paths.map((p) => p.replace(/^"|"$/g, '')),
          maxClips: tvClips,
          audioMode: tvAudio,
          musicVibe: tvVibe,
          goal: tvGoal,
          forcedCta: tvCta,
          clipLength: tvLength,
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Could not build clips')
      if (tvTimer.current) clearInterval(tvTimer.current)
      setTv({ status: 'done', clips: j.clips })
      router.refresh()
    } catch (e) {
      if (tvTimer.current) clearInterval(tvTimer.current)
      setTv({ status: 'error', msg: e instanceof Error ? e.message : 'Could not build clips' })
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-5 max-w-5xl">
      {/* Left: the brief */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 text-amber-600 shrink-0"><Sparkles size={20} /></span>
          <div>
            <h3 className="font-extrabold text-zinc-900">Content Factory</h3>
            <p className="text-sm text-zinc-500">One filming session → a batch of ready-to-review post drafts across BSC TV and RhettStar. Nothing publishes — every post lands in your Calendar as a draft for you to approve.</p>
          </div>
        </div>

        {/* ---- BIG STAR TV ENGINE ---- */}
        <div className="border-2 border-amber-300 rounded-xl p-4 bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-lg">🎪</span>
            <div>
              <h4 className="font-extrabold text-zinc-900">Big Star TV engine</h4>
              <p className="text-xs text-zinc-500">AI <strong>watches</strong> your raw footage, finds the best moments, cuts them vertical, and burns on a hook + call-to-action. Finished clips land in your Calendar as drafts.</p>
            </div>
          </div>

          <label className="text-[11px] font-semibold text-zinc-500 mb-1 block">Choose your video</label>
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => tvFileRef.current?.click()} className="inline-flex items-center gap-1.5 bg-white border-2 border-zinc-900 text-zinc-900 font-bold px-3.5 py-2 rounded-lg text-xs hover:bg-zinc-50 whitespace-nowrap">
              <Upload size={14} /> Add from device
            </button>
            <input ref={tvFileRef} type="file" accept="video/*" multiple className="hidden" onChange={(e) => pickFromDevice(e.target.files)} />
            <select value={tvPath} onChange={(e) => previewFromList(e.target.value)} className="flex-1 min-w-0 px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:border-zinc-900 focus:outline-none bg-white">
              <option value="">{tvListing ? 'Finding your videos…' : tvVideos.length ? `…or pick from your ${tvVideos.length} recent videos` : '— No videos found —'}</option>
              {tvVideos.map((v) => <option key={v.path} value={v.path}>{v.label}</option>)}
            </select>
          </div>

          {tvQueue.length > 0 && (
            <div className="mb-2 bg-white border border-zinc-200 rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-zinc-600">{tvQueue.length} video{tvQueue.length > 1 ? 's' : ''} ready · about {tvQueue.length * tvClips} clips</span>
                <button type="button" onClick={() => { setTvQueue([]); setTvPreview(''); setTvPath('') }} className="text-[11px] font-semibold text-zinc-400 hover:text-red-600">Clear all</button>
              </div>
              <ul className="space-y-1 max-h-28 overflow-y-auto">
                {tvQueue.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-[11px] text-zinc-600">
                    <button type="button" onClick={() => previewFromList(p)} className="flex-1 min-w-0 truncate text-left hover:text-zinc-900 hover:underline">▶ {p.split(/[\\/]/).pop()}</button>
                    <button type="button" onClick={() => removeFromQueue(p)} className="text-zinc-300 hover:text-red-600 shrink-0" title="Remove">×</button>
                  </li>
                ))}
              </ul>
              {tvQueue.length >= 8 && <p className="text-[10px] text-amber-600 mt-1">That&apos;s the max of 8 per run.</p>}
            </div>
          )}

          {tvPreview && (
            <div className="mb-2">
              <video src={tvPreview} controls playsInline className="w-full max-h-56 rounded-lg border border-zinc-200 bg-black" />
              <p className="text-[11px] text-zinc-500 mt-1 truncate">▶ {tvPickedName} — check it&apos;s the right one, then make your clips.</p>
            </div>
          )}

          <input value={tvPath} onChange={(e) => setTvPath(e.target.value)} placeholder="…or paste a file path (right-click the file → Copy as path)" className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-[11px] focus:border-zinc-900 focus:outline-none mb-2" />

          {/* What's this batch FOR? */}
          <label className="text-[11px] font-bold text-zinc-600 mb-1 block">🎯 What&apos;s the goal of these videos?</label>
          <textarea value={tvGoal} onChange={(e) => setTvGoal(e.target.value)} rows={2}
            placeholder="e.g. Promote the Play On voucher — fun, energetic, get parents to book a class using their voucher."
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:border-zinc-900 focus:outline-none mb-2 resize-none" />

          {/* Sound */}
          <label className="text-[11px] font-bold text-zinc-600 mb-1 block">🔊 Sound</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {([['music', 'Music only'], ['original', 'Original class sound'], ['both', 'Both mixed']] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setTvAudio(k)} className={`px-3 py-1.5 rounded-md border text-xs font-semibold ${tvAudio === k ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>{l}</button>
            ))}
          </div>
          {tvAudio !== 'original' && (
            <div className="mb-2">
              <div className="flex gap-2">
                <input value={tvVibe} onChange={(e) => setTvVibe(e.target.value)}
                  placeholder="Music vibe — e.g. energetic, funny, circus, upbeat"
                  className="flex-1 min-w-0 px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:border-zinc-900 focus:outline-none" />
                <button type="button" onClick={findMusic} disabled={musicBusy}
                  className="inline-flex items-center gap-1.5 bg-white border border-zinc-300 text-zinc-700 font-semibold px-3 py-2 rounded-lg text-xs hover:bg-zinc-50 disabled:opacity-50 whitespace-nowrap">
                  <Sparkles size={13} /> {musicBusy ? 'Finding…' : 'Find music'}
                </button>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">{musicCount} track{musicCount === 1 ? '' : 's'} in your library. &ldquo;Find music&rdquo; downloads free, commercially-safe tracks matching your vibe.</p>
              {musicMsg && <p className={`text-[11px] mt-1 ${musicMsg.startsWith('✅') ? 'text-emerald-600' : 'text-amber-600'}`}>{musicMsg}</p>}
            </div>
          )}

          {/* Optional: force the CTA */}
          <input value={tvCta} onChange={(e) => setTvCta(e.target.value)}
            placeholder="📣 Force a call-to-action (optional) — e.g. Book with your Play On voucher"
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:border-zinc-900 focus:outline-none mb-2" />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-zinc-500">Clips per video:</span>
              {[3, 4, 6].map((n) => (
                <button key={n} type="button" onClick={() => setTvClips(n)} className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${tvClips === n ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>{n}</button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-zinc-500">Length:</span>
              {([['short', 'Short'], ['medium', 'Medium'], ['long', 'Long']] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setTvLength(k)} className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${tvLength === k ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>{l}</button>
              ))}
            </div>
          </div>

          <button onClick={runBigStarTV} disabled={tv.status === 'running'} className="inline-flex items-center gap-2 bg-[#D72027] text-white font-bold px-5 py-2.5 rounded-lg text-sm hover:bg-[#A0151B] disabled:opacity-50">
            <Sparkles size={16} /> {tv.status === 'running' ? 'Making your clips…' : tvQueue.length > 1 ? `Make clips from ${tvQueue.length} videos` : 'Make my clips'}
          </button>

          {tv.status === 'running' && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-amber-700">{tvElapsed < 30 ? 'Uploading your video to the AI…' : tvElapsed < 90 ? 'AI is watching your footage…' : tvElapsed < 180 ? 'Found the good bits — cutting clips…' : 'Adding hooks, music and captions…'}</span>
                <span className="text-xs font-mono text-zinc-500">{mmss(tvElapsed)}</span>
              </div>
              <div className="h-2 w-full bg-amber-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(95, Math.round((tvElapsed / 300) * 100))}%` }} />
              </div>
              <p className="text-[11px] text-zinc-400 mt-1.5">Keep this page open. A 5-minute video takes a few minutes.</p>
            </div>
          )}
          {tv.status === 'done' && <p className="text-xs text-emerald-600 font-semibold mt-2">✅ {tv.clips?.length} clips made — scroll down on the right, and check your Calendar.</p>}
          {tv.status === 'error' && <p className="text-xs text-red-600 mt-2">{tv.msg}</p>}
        </div>

        <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/60">
          <label className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1.5 block">🎬 Bring in a video (auto-clip with Vizard)</label>
          <div className="flex gap-2">
            <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Paste a YouTube / Google Drive / video link" className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none" />
            <button onClick={sendToVizard} disabled={viz.status === 'submitting' || viz.status === 'processing'} className="inline-flex items-center gap-1.5 bg-zinc-900 text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50 whitespace-nowrap">{viz.status === 'submitting' ? 'Sending…' : viz.status === 'processing' ? 'Cutting…' : 'Send to Vizard'}</button>
          </div>
          {viz.status === 'processing' && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-amber-700 flex items-center gap-1"><Sparkles size={12} className="animate-pulse" /> {vizStage(elapsed)}</span>
                <span className="text-xs font-mono text-zinc-500">{mmss(elapsed)}</span>
              </div>
              <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all duration-1000" style={{ width: `${vizPct(elapsed)}%` }} />
              </div>
              <p className="text-[11px] text-zinc-400 mt-1.5">Time-based estimate (Vizard doesn&apos;t report an exact %). Keep this page open — big videos take a few minutes.</p>
            </div>
          )}
          {viz.status === 'done' && <p className="text-xs text-emerald-600 mt-2">✅ Vizard finished — {viz.created} clips came back and posts were generated below.</p>}
          {viz.status === 'error' && <p className="text-xs text-red-600 mt-2">{viz.msg}</p>}
          <p className="text-[11px] text-zinc-400 mt-2">Vizard cuts your long video into short clips, then I write posts from them. Or just type a brief below.</p>

          <div className="mt-3 pt-3 border-t border-zinc-200">
            <label className="text-[11px] font-semibold text-zinc-500 mb-1 block">Already cut it in Vizard? Paste the project link to pull those clips in (no re-processing)</label>
            <div className="flex gap-2">
              <input value={projectLink} onChange={(e) => setProjectLink(e.target.value)} placeholder="https://vizard.ai/project/123456" className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:border-zinc-900 focus:outline-none" />
              <button onClick={importFromVizard} disabled={viz.status === 'processing' || viz.status === 'submitting'} className="inline-flex items-center gap-1.5 bg-white border border-zinc-300 text-zinc-700 font-semibold px-3 py-2 rounded-lg text-xs disabled:opacity-50 whitespace-nowrap hover:bg-zinc-50">Import clips</button>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1.5 block">Filming day brief</label>
          <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={10}
            placeholder={'Paste what happened on filming day, or your Opus Clip notes. The more detail, the better the posts.\n\nExample:\n• A 6yo landed her first cartwheel after weeks of trying — whole class cheered.\n• Rhett explained why we never rank kids.\n• Funny moment: a hula hoop went flying.\n• Aerial silks class — confident teen routine.'}
            className="w-full px-3.5 py-3 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none resize-none" />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1.5 block">Brands</label>
          <div className="flex flex-wrap gap-2">
            {['BSC TV', 'RhettStar'].map((b) => {
              const on = brands.includes(b)
              return (
                <button key={b} onClick={() => toggleBrand(b)} className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium ${on ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
                  {b}{on && <Check size={14} />}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1.5 block">How many posts</label>
          <div className="flex gap-2">
            {[5, 10, 15].map((n) => (
              <button key={n} onClick={() => setCount(n)} className={`px-4 py-2 rounded-lg border text-sm font-semibold ${count === n ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>{n}</button>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2">
          🛡️ Child safety: drafts never include a child&apos;s surname, school or location. Only post a child&apos;s photo or video once you have parent consent on file.
        </div>

        {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{err}</div>}

        <div className="flex items-center gap-3 pt-1">
          <button onClick={generate} disabled={busy} className="inline-flex items-center gap-2 bg-zinc-900 text-white font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-50">
            <Sparkles size={16} /> {busy ? 'Generating…' : `Generate ${count} posts`}
          </button>
          {result && <button onClick={() => { router.refresh(); onDone() }} className="text-sm font-semibold text-zinc-600 hover:text-zinc-900">View in Calendar →</button>}
        </div>
      </div>

      {/* Right: results */}
      <div className="space-y-3">
        {tv.status === 'done' && tv.clips?.length ? (
          <>
            <div className="bg-amber-50 border-2 border-amber-300 text-amber-900 text-sm rounded-lg px-3 py-2 font-bold sticky top-0 z-10">
              🎪 {tv.clips.length} clips to review — tick the ones you want to keep
            </div>

            {tv.clips.map((c, i) => {
              const s = rv(i)
              const score = Number(c.viralScore) || 0
              const scoreColour = score >= 9 ? 'text-emerald-600' : score >= 7.5 ? 'text-amber-600' : 'text-zinc-400'
              return (
                <div key={i} className={`bg-white rounded-xl border-2 p-3 ${s.saved ? 'border-emerald-300 bg-emerald-50/40' : s.keep ? 'border-zinc-900' : 'border-amber-200'}`}>
                  {/* Tick + score */}
                  <div className="flex items-center gap-2 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={s.keep} disabled={s.saved} onChange={(e) => setRv(i, { keep: e.target.checked })} className="w-4 h-4 rounded accent-zinc-900" />
                      <span className="text-xs font-bold text-zinc-700">{s.saved ? 'Saved ✓' : 'Keep this one'}</span>
                    </label>
                    <span className="ml-auto text-[11px] font-bold uppercase tracking-wide text-zinc-400">{c.brand}</span>
                    <span className={`text-sm font-extrabold ${scoreColour}`} title="How likely this is to do well">⭐ {c.viralScore}</span>
                  </div>

                  <video src={c.publicPath} controls playsInline className="w-full max-h-64 rounded-lg border border-zinc-200 bg-black mb-2" />
                  <div className="text-sm font-bold text-zinc-900">{c.hook}</div>
                  <p className="text-[11px] text-zinc-500 italic mt-0.5">{c.whatHappens}</p>
                  <p className="text-[11px] text-[#D72027] font-semibold mt-1">📣 {c.cta}</p>

                  {!s.saved && (
                    <div className="mt-2.5 pt-2.5 border-t border-zinc-100 space-y-2">
                      {/* Where it posts */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 block mb-1">Post to</span>
                        <div className="flex flex-wrap gap-1">
                          {EDIT_PLATFORMS.map((p) => {
                            const on = s.platforms.length ? s.platforms.includes(p) : c.platform === p
                            return (
                              <button key={p} type="button"
                                onClick={() => { const cur = s.platforms.length ? s.platforms : [c.platform]; setRv(i, { platforms: cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p] }) }}
                                className={`px-2 py-1 rounded-md border text-[11px] font-semibold ${on ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}>
                                {CHANNELS[p].label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* When */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 block mb-1">Schedule (leave blank = draft)</span>
                        <input type="datetime-local" value={s.when} onChange={(e) => setRv(i, { when: e.target.value })} className="w-full px-2 py-1.5 border border-zinc-200 rounded-md text-[11px] focus:border-zinc-900 focus:outline-none" />
                      </div>

                      {/* Re-edit */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 block mb-1">Not quite right? Tell it what to change</span>
                        <textarea value={s.feedback} onChange={(e) => setRv(i, { feedback: e.target.value })} rows={2}
                          placeholder="e.g. Make the hook funnier and mention the Play On voucher"
                          className="w-full px-2 py-1.5 border border-zinc-200 rounded-md text-[11px] focus:border-zinc-900 focus:outline-none resize-none" />
                        <input value={s.vibe} onChange={(e) => setRv(i, { vibe: e.target.value })} placeholder="…or a different music vibe for this clip"
                          className="w-full mt-1 px-2 py-1.5 border border-zinc-200 rounded-md text-[11px] focus:border-zinc-900 focus:outline-none" />
                        <div className="flex items-center gap-3 mt-1.5">
                          <button type="button" onClick={() => redoClip(i)} disabled={s.busy}
                            className="inline-flex items-center gap-1.5 bg-white border border-zinc-300 text-zinc-700 font-semibold px-3 py-1.5 rounded-md text-[11px] hover:bg-zinc-50 disabled:opacity-50">
                            <Sparkles size={12} /> {s.busy ? 'Re-making…' : 'Re-make this clip'}
                          </button>
                          <a href={c.publicPath} download className="text-[11px] font-semibold text-zinc-500 hover:underline">Download</a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Save the ticked ones */}
            <div className="sticky bottom-0 bg-white border-2 border-zinc-900 rounded-xl p-3 shadow-lg">
              {savedMsg && <p className="text-xs text-emerald-600 font-semibold mb-2">{savedMsg}</p>}
              <button onClick={saveSelected} disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 bg-zinc-900 text-white font-bold px-4 py-2.5 rounded-lg text-sm hover:bg-zinc-800 disabled:opacity-50">
                {saving ? 'Saving…' : `Save ${(tv.clips ?? []).filter((_, i) => rv(i).keep && !rv(i).saved).length} ticked clip(s) to my Calendar`}
              </button>
              <p className="text-[10px] text-zinc-400 mt-1.5 text-center">Nothing is saved until you tap this. Scheduled clips show on the Calendar; the rest stay as drafts.</p>
            </div>
          </>
        ) : null}
        {!result && !busy && tv.status !== 'done' && (
          <div className="bg-white rounded-xl border border-zinc-200 p-6 text-center">
            <Sparkles size={28} className="mx-auto text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-500">Your generated drafts will appear here, and in the Calendar &amp; Posts tabs ready to review.</p>
          </div>
        )}
        {busy && (
          <div className="bg-white rounded-xl border border-zinc-200 p-6 text-center">
            <Sparkles size={28} className="mx-auto text-amber-400 mb-2 animate-pulse" />
            <p className="text-sm text-zinc-500">Writing your posts… this takes a few seconds.</p>
          </div>
        )}
        {result && (
          <>
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg px-3 py-2 font-semibold">✅ {result.length} drafts created — find them in Calendar &amp; Posts.</div>
            {result.map((p, i) => (
              <div key={i} className="bg-white rounded-xl border border-zinc-200 p-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <ChannelBadge platform={p.platform} small />
                  <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">{p.brand}</span>
                  {p.viralScore != null && p.viralScore !== '' && <span className="ml-auto inline-flex items-center gap-1 text-xs font-extrabold text-amber-600" title="Vizard virality score">⭐ {p.viralScore}</span>}
                </div>
                {p.videoUrl && <video src={p.videoUrl} controls playsInline className="w-full max-h-56 rounded-lg border border-zinc-200 bg-black mb-2" />}
                {p.hook && <div className="text-sm font-semibold text-zinc-900 mb-1">{p.hook}</div>}
                {p.viralReason && <p className="text-[11px] text-zinc-400 italic mb-1">{p.viralReason}</p>}
                <p className="text-sm text-zinc-600 line-clamp-4 whitespace-pre-wrap">{p.caption}</p>
                {p.hashtags?.length > 0 && <p className="text-xs text-sky-600 mt-1.5 truncate">{p.hashtags.join(' ')}</p>}
                {p.editorUrl && <a href={p.editorUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#D72027] hover:underline"><Link2 size={12} /> Edit in Vizard ↗</a>}
              </div>
            ))}
          </>
        )}
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
