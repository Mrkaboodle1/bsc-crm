import { verifySession } from '@/lib/dal'
import { redirect } from 'next/navigation'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { DashboardShell } from '@/components/dashboard-shell'
import { TrackingSnippet } from '@/components/tracking-snippet'

export const dynamic = 'force-dynamic'

// Who's finding BigStar online, and what they look at once they're on the site.
export default async function VisitorsPage() {
  const user = await verifySession()
  if (!['owner', 'manager'].includes(user.role)) redirect('/dashboard')
  const admin = createAdminSupabase()
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://app-chi-silk-29.vercel.app'

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const { data, error } = await admin
    .from('site_visits')
    .select('path, source, search_term, referrer, visitor_id, occurred_at')
    .eq('tenant_id', user.tenantId)
    .gte('occurred_at', since)
    .order('occurred_at', { ascending: false })
    .limit(5000)

  const needsSetup = !!error
  const rows = data ?? []

  const bySource = new Map<string, number>()
  const byPath = new Map<string, number>()
  const searches = new Map<string, number>()
  const visitors = new Set<string>()
  for (const r of rows) {
    bySource.set(r.source || 'direct', (bySource.get(r.source || 'direct') ?? 0) + 1)
    byPath.set(r.path || '/', (byPath.get(r.path || '/') ?? 0) + 1)
    if (r.search_term) searches.set(r.search_term, (searches.get(r.search_term) ?? 0) + 1)
    if (r.visitor_id) visitors.add(r.visitor_id)
  }
  const top = (m: Map<string, number>, n = 10) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
  const ICON: Record<string, string> = { google: '🔍', facebook: '📘', instagram: '📷', direct: '🔗', bing: '🔎', youtube: '▶️', tiktok: '🎵', internal: '🏠' }

  return (
    <DashboardShell user={user} currentPath="/marketing/visitors" pageTitle="Website Visitors" pageSubtitle="Where people find you, and what they look at — last 30 days.">
      {needsSetup ? (
        <div className="bg-white rounded-2xl border-2 border-amber-300 p-8 text-center max-w-xl mx-auto mb-6">
          <div className="text-4xl mb-2">🗄️</div>
          <h2 className="text-xl font-black text-zinc-900">One setup step needed</h2>
          <p className="text-zinc-600 mt-2">Paste <strong>schema/058_tectonic_cutover.sql</strong> into the Supabase SQL editor and hit <strong>Run</strong>. Then add the snippet below to your website.</p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Stat label="Page views" value={rows.length.toLocaleString()} />
            <Stat label="Different visitors" value={visitors.size.toLocaleString()} />
            <Stat label="Found you via Google" value={(bySource.get('google') ?? 0).toLocaleString()} good />
            <Stat label="Searched on your site" value={searches.size.toLocaleString()} />
          </section>

          <div className="grid lg:grid-cols-3 gap-4 mb-6">
            <Card title="🌏 Where they came from">
              {top(bySource).length === 0 ? <Empty /> : top(bySource).map(([k, v]) => (
                <Bar key={k} label={`${ICON[k] ?? '🌐'} ${k}`} value={v} max={top(bySource)[0]![1]} />
              ))}
            </Card>
            <Card title="📄 Most-viewed pages">
              {top(byPath).length === 0 ? <Empty /> : top(byPath).map(([k, v]) => (
                <Bar key={k} label={k} value={v} max={top(byPath)[0]![1]} />
              ))}
            </Card>
            <Card title="🔎 What they searched for">
              {top(searches).length === 0
                ? <p className="text-sm text-zinc-400">Nothing yet — this fills in once people use the search box on your site.</p>
                : top(searches).map(([k, v]) => <Bar key={k} label={`“${k}”`} value={v} max={top(searches)[0]![1]} />)}
            </Card>
          </div>
        </>
      )}

      <TrackingSnippet endpoint={`${base}/api/track`} />
    </DashboardShell>
  )
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4">
      <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`text-2xl font-black tabular-nums mt-1 ${good ? 'text-emerald-600' : 'text-zinc-900'}`}>{value}</div>
    </div>
  )
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5">
      <h3 className="font-black text-zinc-900 mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
function Empty() { return <p className="text-sm text-zinc-400">No visits recorded yet — add the snippet below to your website.</p> }
function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.max(4, (value / max) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-sm mb-0.5 gap-2">
        <span className="text-zinc-700 truncate">{label}</span>
        <span className="font-bold tabular-nums shrink-0">{value}</span>
      </div>
      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#D72027] to-[#F5A623] rounded-full" style={{ width: `${pct}%` }} /></div>
    </div>
  )
}
