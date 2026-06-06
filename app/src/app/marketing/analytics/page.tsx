import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'

const SOURCE_LABEL: Record<string, string> = {
  fb_ad: 'Facebook', instagram: 'Instagram', google: 'Google', word_of_mouth: 'Word of mouth',
  school: 'School', walkin: 'Walk-in', open_day: 'Open day', other: 'Other',
}

export default async function AnalyticsPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('families')
    .select('source, lifecycle_stage, created_at, weekly_fee_total, tags')
    .limit(5000)
  const fams = (data ?? []).filter((f) => !(f.tags ?? []).includes('from-roll-sheet'))

  const total = fams.length
  const paying = fams.filter((f) => (f.weekly_fee_total ?? 0) > 0).length
  const leads = fams.filter((f) => f.lifecycle_stage === 'lead').length
  const trials = fams.filter((f) => f.lifecycle_stage === 'trial').length
  const weeklyRevenue = fams.reduce((s, f) => s + (Number(f.weekly_fee_total) || 0), 0)

  // By source
  const bySource = new Map<string, number>()
  for (const f of fams) { const s = f.source || 'unknown'; bySource.set(s, (bySource.get(s) ?? 0) + 1) }
  const sourceRows = [...bySource.entries()].sort((a, b) => b[1] - a[1])
  const sourceMax = Math.max(1, ...sourceRows.map(([, n]) => n))

  // New contacts — last 6 months
  const now = new Date()
  const months: { label: string; key: string; count: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ label: d.toLocaleDateString('en-AU', { month: 'short' }), key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, count: 0 })
  }
  for (const f of fams) {
    if (!f.created_at) continue
    const k = f.created_at.slice(0, 7)
    const m = months.find((x) => x.key === k)
    if (m) m.count++
  }
  const monthMax = Math.max(1, ...months.map((m) => m.count))
  const convRate = total > 0 ? Math.round((paying / total) * 100) : 0

  return (
    <DashboardShell user={user} currentPath="/marketing/analytics" pageTitle="Analytics" pageSubtitle="Your funnel at a glance — built from your real contacts.">
      <div className="space-y-6 max-w-5xl">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi label="Total contacts" value={total.toLocaleString()} />
          <Kpi label="Paying families" value={paying.toLocaleString()} accent />
          <Kpi label="Leads + trials" value={(leads + trials).toLocaleString()} />
          <Kpi label="Weekly revenue" value={`$${weeklyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} accent />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* New contacts by month */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <h3 className="font-semibold text-zinc-900 mb-1">New contacts</h3>
            <p className="text-xs text-zinc-500 mb-5">Last 6 months</p>
            <div className="flex items-end justify-between gap-2 h-40">
              {months.map((m) => (
                <div key={m.key} className="flex-1 flex flex-col items-center justify-end gap-1.5">
                  <span className="text-xs font-bold text-zinc-700">{m.count}</span>
                  <div className="w-full rounded-t-md bg-[#D72027]" style={{ height: `${(m.count / monthMax) * 100}%`, minHeight: m.count > 0 ? 6 : 2 }} />
                  <span className="text-[10px] text-zinc-400">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Conversion */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col">
            <h3 className="font-semibold text-zinc-900 mb-1">Lead → paying</h3>
            <p className="text-xs text-zinc-500 mb-5">Share of contacts who are paying families</p>
            <div className="flex-1 flex items-center justify-center">
              <div className="relative w-40 h-40 rounded-full" style={{ background: `conic-gradient(#D72027 ${convRate * 3.6}deg, #f4f4f5 0deg)` }}>
                <div className="absolute inset-3 bg-white rounded-full flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-zinc-900">{convRate}%</span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wide">paying</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* By source */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="font-semibold text-zinc-900 mb-1">Where contacts come from</h3>
          <p className="text-xs text-zinc-500 mb-5">Lead source across all contacts</p>
          <div className="space-y-2.5">
            {sourceRows.map(([s, n]) => (
              <div key={s} className="flex items-center gap-3">
                <span className="w-28 text-sm text-zinc-600 shrink-0">{s === 'unknown' ? 'Unknown' : (SOURCE_LABEL[s] ?? s)}</span>
                <div className="flex-1 bg-zinc-100 rounded-full h-5 overflow-hidden">
                  <div className="h-full bg-[#FFC107] rounded-full" style={{ width: `${(n / sourceMax) * 100}%` }} />
                </div>
                <span className="w-10 text-right text-sm font-semibold text-zinc-700">{n}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-zinc-400 mt-4">Set a source on each contact (or via forms) to make this sharper. Facebook &amp; Google numbers fill out once those are connected.</p>
        </div>
      </div>
    </DashboardShell>
  )
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? 'bg-[#D72027] border-[#D72027] text-white' : 'bg-white border-zinc-200'}`}>
      <div className={`text-2xl font-extrabold ${accent ? '' : 'text-zinc-900'}`}>{value}</div>
      <div className={`text-xs mt-1 ${accent ? 'text-white/80' : 'text-zinc-500'}`}>{label}</div>
    </div>
  )
}
