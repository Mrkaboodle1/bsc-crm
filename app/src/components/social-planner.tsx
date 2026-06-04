'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

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

const TABS = ['Planner', 'Content', 'Comments', 'Statistics', 'Social Listening', 'Settings'] as const
type Tab = (typeof TABS)[number]

const STATUS_UI: Record<string, { label: string; cls: string; dot: string }> = {
  posted:    { label: 'Published', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  scheduled: { label: 'Scheduled', cls: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500' },
  draft:     { label: 'Draft',     cls: 'bg-zinc-100 text-zinc-600 border-zinc-200',          dot: 'bg-zinc-400' },
  failed:    { label: 'Failed',    cls: 'bg-red-50 text-red-700 border-red-200',              dot: 'bg-red-500' },
}
const CHANNELS: { key: string; label: string; emoji: string; ring: string }[] = [
  { key: 'instagram', label: 'Instagram', emoji: '📸', ring: 'ring-pink-300' },
  { key: 'facebook',  label: 'Facebook',  emoji: '📘', ring: 'ring-blue-300' },
  { key: 'threads',   label: 'Threads',   emoji: '🧵', ring: 'ring-zinc-400' },
  { key: 'tiktok',    label: 'TikTok',    emoji: '🎵', ring: 'ring-zinc-400' },
]
const channelOf = (k: string | null) => CHANNELS.find((c) => c.key === k)
const PER_PAGE = 10

function fmtDate(p: SocialPost) {
  const d = p.scheduled_for || p.posted_at || p.created_at
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function SocialPlanner({ posts }: { posts: SocialPost[] }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('Planner')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [channel, setChannel] = useState<string>('all')
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [menu, setMenu] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return posts.filter((p) => {
      if (status !== 'all' && p.status !== status) return false
      if (channel !== 'all' && p.platform !== channel) return false
      if (q && !(p.caption || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [posts, search, status, channel])

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const view = filtered.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: posts.length, posted: 0, scheduled: 0, draft: 0, failed: 0 }
    for (const p of posts) c[p.status] = (c[p.status] || 0) + 1
    return c
  }, [posts])

  async function del(id: string) {
    setBusy(id); setMenu(null)
    try {
      await fetch('/api/social/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      router.refresh()
    } finally { setBusy(null) }
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-200 mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 -mb-px ${tab === t ? 'border-[#D72027] text-[#D72027]' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Planner' && (
        <>
          {/* Toolbar */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-3 mb-4 shadow-sm flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="🔎 Search by caption…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              className="flex-1 min-w-[200px] px-3 py-2 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none"
            />
            <div className="flex gap-1 flex-wrap">
              {[['all', 'All'], ['posted', 'Published'], ['scheduled', 'Scheduled'], ['draft', 'Draft'], ['failed', 'Failed']].map(([k, lbl]) => (
                <button
                  key={k}
                  onClick={() => { setStatus(k); setPage(0) }}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${status === k ? 'bg-[#D72027] text-white border-[#D72027]' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'}`}
                >
                  {lbl}{k !== 'all' && counts[k] ? ` ${counts[k]}` : ''}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <button onClick={() => { setChannel('all'); setPage(0) }} className={`text-xs font-semibold w-8 h-8 rounded-lg border ${channel === 'all' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-200'}`}>All</button>
              {CHANNELS.map((c) => (
                <button key={c.key} title={c.label} onClick={() => { setChannel(channel === c.key ? 'all' : c.key); setPage(0) }} className={`w-8 h-8 rounded-lg border text-base ${channel === c.key ? 'bg-amber-100 border-amber-300' : 'bg-white border-zinc-200 hover:bg-zinc-50'}`}>{c.emoji}</button>
              ))}
            </div>
          </div>

          {/* Table or empty state */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
              <div className="text-5xl mb-3">🗓️</div>
              <h3 className="text-lg font-extrabold text-zinc-900 mb-1">{posts.length === 0 ? 'No posts yet' : 'No posts match your filters'}</h3>
              <p className="text-sm text-zinc-500 mb-5">{posts.length === 0 ? 'Create your first post and it’ll show up right here.' : 'Try clearing a filter.'}</p>
              {posts.length === 0 && <a href="/marketing/social/new" className="inline-flex items-center gap-2 bg-[#D72027] text-white font-bold px-5 py-3 rounded-xl">＋ Create your first post</a>}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
                      <th className="px-4 py-3 font-bold">Caption</th>
                      <th className="px-3 py-3 font-bold">Media</th>
                      <th className="px-3 py-3 font-bold">Status</th>
                      <th className="px-3 py-3 font-bold">Type</th>
                      <th className="px-3 py-3 font-bold">Date</th>
                      <th className="px-3 py-3 font-bold">Channel</th>
                      <th className="px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.map((p) => {
                      const st = STATUS_UI[p.status] || STATUS_UI.draft
                      const ch = channelOf(p.platform)
                      return (
                        <tr key={p.id} className="border-b border-zinc-50 hover:bg-zinc-50/60">
                          <td className="px-4 py-3 max-w-[360px]">
                            <div className="font-semibold text-zinc-800 truncate">{p.caption || '(no caption)'}</div>
                          </td>
                          <td className="px-3 py-3">
                            {p.media_url
                              ? <img src={p.media_url} alt="" className="w-11 h-11 rounded-lg object-cover border border-zinc-200" />
                              : <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-[#FFD54F] to-[#D72027] flex items-center justify-center text-white text-lg">🎪</div>}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${st.cls}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-zinc-500">Post</td>
                          <td className="px-3 py-3 text-zinc-700 whitespace-nowrap">{fmtDate(p)}</td>
                          <td className="px-3 py-3">
                            {ch ? <span title={ch.label} className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-white ring-1 ${ch.ring} text-base`}>{ch.emoji}</span> : <span className="text-zinc-300">—</span>}
                          </td>
                          <td className="px-3 py-3 relative">
                            <button onClick={() => setMenu(menu === p.id ? null : p.id)} className="w-8 h-8 rounded-lg hover:bg-zinc-100 text-zinc-400 text-lg leading-none" disabled={busy === p.id}>⋮</button>
                            {menu === p.id && (
                              <div className="absolute right-2 top-10 z-10 bg-white border border-zinc-200 rounded-xl shadow-lg py-1 w-32">
                                <a href="/marketing/social/new" className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">Duplicate</a>
                                <button onClick={() => del(p.id)} className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">Delete</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 text-xs text-zinc-500">
                <span>{page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, filtered.length)} of {filtered.length}</span>
                <div className="flex gap-1">
                  <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border border-zinc-200 disabled:opacity-40 font-semibold">Previous</button>
                  <span className="px-3 py-1.5 font-bold text-zinc-700">{page + 1} / {pages}</span>
                  <button disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border border-zinc-200 disabled:opacity-40 font-semibold">Next</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'Statistics' && <Stats posts={posts} />}

      {tab !== 'Planner' && tab !== 'Statistics' && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
          <div className="text-4xl mb-3">🚧</div>
          <h3 className="text-lg font-extrabold text-zinc-900 mb-1">{tab} — coming soon</h3>
          <p className="text-sm text-zinc-500">This tab is on the roadmap. For now, the <button onClick={() => setTab('Planner')} className="text-[#D72027] font-bold hover:underline">Planner</button> is where the magic happens.</p>
        </div>
      )}
    </div>
  )
}

function Stats({ posts }: { posts: SocialPost[] }) {
  const published = posts.filter((p) => p.status === 'posted')
  const sum = (k: keyof SocialPost) => published.reduce((n, p) => n + (Number(p[k]) || 0), 0)
  const cards = [
    { label: 'Published posts', value: published.length, icon: '✅' },
    { label: 'Total reach', value: sum('reach'), icon: '👀' },
    { label: 'Likes', value: sum('likes'), icon: '❤️' },
    { label: 'Comments', value: sum('comments'), icon: '💬' },
    { label: 'Shares', value: sum('shares'), icon: '🔁' },
    { label: 'Saves', value: sum('saves'), icon: '🔖' },
  ]
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
          <div className="text-2xl mb-1">{c.icon}</div>
          <div className="text-2xl font-extrabold text-zinc-900">{c.value.toLocaleString()}</div>
          <div className="text-xs text-zinc-500 font-semibold">{c.label}</div>
        </div>
      ))}
      {published.length === 0 && <p className="col-span-full text-center text-sm text-zinc-400 py-4">Stats appear once posts are published and insights sync from Instagram/Facebook.</p>}
    </div>
  )
}
