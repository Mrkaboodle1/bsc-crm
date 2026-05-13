// Marketing landing — media library + post composer entry point.

import type { mediaStats } from '@/data/media-stats'

type Stats = typeof mediaStats

type RecentPost = {
  id: string
  mediaHash: string | null
  platform: string
  postedAt: string
  caption: string | null
}

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸',
  facebook: '📘',
  threads: '🧵',
  tiktok: '🎵',
  email: '✉️',
  sms: '📱',
}

export function MarketingOverview({ stats, recentPosts }: { stats: Stats; recentPosts: RecentPost[] }) {
  const yearEntries = Object.entries(stats.byYear).sort((a, b) => a[0].localeCompare(b[0]))
  return (
    <div className="space-y-8">
      {/* KPI row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Kpi icon="🖼" label="Images cataloged" value={stats.totalImages.toLocaleString()} accent="from-[#D72027] to-[#A0151B]" />
        <Kpi icon="🎬" label="Videos cataloged" value={stats.totalVideos.toLocaleString()} accent="from-purple-500 to-purple-700" />
        <Kpi icon="💽" label="Total size" value={`${stats.totalGB} GB`} accent="from-blue-500 to-blue-700" />
        <Kpi icon="📥" label="HEIC (iPhone)" value={stats.totalHeic.toLocaleString()} accent="from-amber-500 to-amber-600" />
      </section>

      {/* Action row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActionCard
          href="/marketing/compose"
          icon="✏️"
          title="Compose a post"
          subtitle="Pick an image (or generate one), draft the caption, post or schedule. Auto-blocks images used in the last 30 days."
          accent
        />
        <ActionCard
          href="/marketing/library"
          icon="🗂"
          title="Media library"
          subtitle="Browse, search and tag your 2,073 photos + videos."
        />
        <ActionCard
          href="/marketing/duplicates"
          icon="📑"
          title="Duplicate cleanup"
          subtitle={`${stats.dupSets} duplicate sets · ${stats.dupGB.toFixed(2)} GB you could reclaim.`}
        />
      </section>

      {/* Library snapshot */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By year */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5 lg:col-span-1">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-zinc-500 mb-3">
            By year
          </h3>
          <ul className="space-y-2">
            {yearEntries.length === 0 && <li className="text-sm text-zinc-500">No data</li>}
            {yearEntries.map(([year, count]) => {
              const max = Math.max(...yearEntries.map(([, c]) => c))
              const pct = (count / max) * 100
              return (
                <li key={year} className="flex items-center gap-3">
                  <span className="w-12 text-sm font-bold text-zinc-600">{year}</span>
                  <div className="flex-1 h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#D72027] to-[#FFC107]" style={{ width: `${pct}%` }} aria-hidden />
                  </div>
                  <span className="w-12 text-right text-xs font-extrabold text-zinc-900">{count}</span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Top folders */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5 lg:col-span-2">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-zinc-500 mb-3">
            Where the photos live
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {stats.topFolders.map((f) => (
              <li key={f.name} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-zinc-50">
                <span className="text-zinc-700 truncate">📂 {f.name}</span>
                <span className="font-extrabold text-zinc-900 text-xs">{f.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Recent example files */}
      <section>
        <h3 className="text-lg font-extrabold text-zinc-900 mb-3">Most recent files</h3>
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-left text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                <th className="px-5 py-3">File</th>
                <th className="px-4 py-3 hidden sm:table-cell">Format</th>
                <th className="px-4 py-3 hidden md:table-cell">Hash</th>
                <th className="px-4 py-3 text-right">Size</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Captured</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {stats.recentExamples.map((f) => (
                <tr key={f.sha8 + f.name} className="hover:bg-zinc-50">
                  <td className="px-5 py-2.5 font-bold text-zinc-700 truncate max-w-[300px]">{f.name}</td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-zinc-100 px-2 py-0.5 rounded">{f.ext}</span>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-[10px] font-mono text-zinc-400">{f.sha8}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-600">{(f.sizeKB / 1024).toFixed(1)} MB</td>
                  <td className="px-4 py-2.5 text-right hidden sm:table-cell text-xs text-zinc-500">
                    {new Date(f.mtime).toLocaleDateString('en-AU')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent posts (if any) */}
      <section>
        <h3 className="text-lg font-extrabold text-zinc-900 mb-3">Recent posts</h3>
        {recentPosts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 text-center text-sm text-zinc-500">
            <div className="text-4xl mb-2">📣</div>
            <p className="font-bold text-zinc-700">No posts logged yet.</p>
            <p className="mt-1">
              <a href="/marketing/compose" className="text-[#D72027] font-bold hover:underline">Compose your first one →</a>
            </p>
          </div>
        ) : (
          <ul className="bg-white rounded-2xl shadow-sm border border-zinc-200 divide-y divide-zinc-100">
            {recentPosts.map((p) => (
              <li key={p.id} className="flex items-start gap-3 px-5 py-3">
                <span className="text-2xl">{PLATFORM_EMOJI[p.platform] || '📣'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-zinc-900 capitalize">{p.platform}</div>
                  {p.caption && <p className="text-sm text-zinc-700 truncate">{p.caption}</p>}
                  <div className="text-[10px] text-zinc-400 mt-0.5 uppercase tracking-wider font-bold">
                    {new Date(p.postedAt).toLocaleString('en-AU')}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Footer note */}
      <p className="text-xs text-zinc-500 px-1">
        Catalog last refreshed {new Date(stats.generatedAt as string).toLocaleString('en-AU')} ·
        regenerate with <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded">node scripts/catalog-media.mjs</code>
      </p>
    </div>
  )
}

function Kpi({ icon, label, value, accent }: { icon: string; label: string; value: string; accent: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4 sm:p-5 relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} aria-hidden />
      <div className="flex items-center gap-3">
        <span className="text-2xl sm:text-3xl">{icon}</span>
        <div>
          <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 leading-none">{value}</div>
          <div className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-500 font-bold mt-1">{label}</div>
        </div>
      </div>
    </div>
  )
}

function ActionCard({ href, icon, title, subtitle, accent }: { href: string; icon: string; title: string; subtitle: string; accent?: boolean }) {
  return (
    <a
      href={href}
      className={`block rounded-2xl shadow-sm border p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all ${
        accent ? 'bg-gradient-to-br from-[#D72027] to-[#A0151B] text-white border-transparent' : 'bg-white border-zinc-200'
      }`}
    >
      <div className="text-3xl mb-2">{icon}</div>
      <div className={`font-extrabold ${accent ? 'text-white' : 'text-zinc-900'}`}>{title}</div>
      <p className={`text-xs mt-1 ${accent ? 'text-amber-100' : 'text-zinc-500'}`}>{subtitle}</p>
    </a>
  )
}
