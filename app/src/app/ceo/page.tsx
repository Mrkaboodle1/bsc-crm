import { verifySession } from '@/lib/dal'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { getCeoDashboard, MILESTONES } from '@/lib/ceo-dashboard'
import { StadiumFundAdd } from '@/components/stadium-fund-add'

export const dynamic = 'force-dynamic'

const money = (n: number) => '$' + Math.round(n).toLocaleString('en-AU')
const STATUS_UI: Record<string, { dot: string; label: string }> = {
  open: { dot: 'bg-emerald-500', label: 'OPEN' },
  launch_ready: { dot: 'bg-emerald-500', label: 'READY' },
  demand_test: { dot: 'bg-amber-400', label: 'TESTING' },
  venue_search: { dot: 'bg-orange-500', label: 'VENUE' },
  watch: { dot: 'bg-blue-400', label: 'WATCH' },
  research: { dot: 'bg-zinc-400', label: 'RESEARCH' },
  rejected: { dot: 'bg-red-500', label: 'REJECTED' },
}

export default async function CeoPage() {
  const user = await verifySession()
  if (!['owner', 'manager'].includes(user.role)) redirect('/dashboard')
  const d = await getCeoDashboard()

  return (
    <DashboardShell user={user} currentPath="/ceo" pageTitle="CEO Dashboard" pageSubtitle={`Every number that says whether we're getting closer to Cbus Stadium. Goal: ${d.targets.students} students by ${d.targets.target_year}.`}>
      {/* The ladder */}
      <section className="bg-gradient-to-br from-zinc-950 to-zinc-800 rounded-3xl p-6 sm:p-8 text-white mb-6">
        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#FFC107] mb-3">The road to Cbus Stadium</div>
        <div className="grid sm:grid-cols-2 gap-6 items-center">
          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-black tabular-nums">{d.students.active}</span>
              <span className="text-xl text-white/50">/ {d.targets.students} students</span>
            </div>
            <div className="mt-3 h-4 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#D72027] to-[#FFC107] rounded-full transition-all" style={{ width: `${Math.max(2, d.students.pct)}%` }} />
            </div>
            <div className="mt-2 text-sm text-white/70">
              {d.students.pct}% there · now at <strong className="text-white">{d.students.milestone}</strong>
              {d.students.nextAt && <> · next milestone <strong className="text-white">{d.students.nextAt}</strong></>}
            </div>
          </div>
          <ol className="space-y-1.5">
            {MILESTONES.map((m) => {
              const hit = d.students.active >= m.students
              return (
                <li key={m.students} className={`flex items-center gap-2.5 text-sm ${hit ? 'text-white' : 'text-white/40'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${hit ? 'bg-[#FFC107] text-zinc-900' : 'bg-white/10'}`}>{hit ? '✓' : ''}</span>
                  <span className="font-bold tabular-nums w-9">{m.students}</span>
                  <span>{m.label}</span>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {/* Alerts */}
      {d.alerts.length > 0 && (
        <section className="grid gap-2 mb-6">
          {d.alerts.map((a, i) => (
            <div key={i} className={`flex items-start gap-2.5 rounded-xl border-2 px-4 py-2.5 text-sm ${
              a.level === 'bad' ? 'border-red-300 bg-red-50 text-red-900'
              : a.level === 'warn' ? 'border-amber-300 bg-amber-50 text-amber-900'
              : 'border-emerald-300 bg-emerald-50 text-emerald-900'}`}>
              <span>{a.level === 'bad' ? '🔴' : a.level === 'warn' ? '🟡' : '🟢'}</span>
              <span className="font-semibold">{a.text}</span>
            </div>
          ))}
        </section>
      )}

      {/* The 12 KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi n="1" label="Active students" value={String(d.students.active)} sub={`${d.students.pct}% of ${d.targets.students}`} tone="brand" />
        <Kpi n="2" label="Net growth (30d)" value={`${d.growth.net >= 0 ? '+' : ''}${d.growth.net}`} sub={`+${d.growth.joined} joined · −${d.growth.cancelled} left`} tone={d.growth.net > 0 ? 'good' : d.growth.net < 0 ? 'bad' : 'flat'} />
        <Kpi n="3" label="Recurring revenue" value={money(d.revenue.annualised)} sub={`${money(d.revenue.weekly)}/wk · ${d.revenue.pct}% of target`} tone="brand" />
        <Kpi n="4" label="Retention" value={`${d.retention.pct}%`} sub={`${d.retention.active} of ${d.retention.everStarted} ever started`} tone={d.retention.pct >= 90 ? 'good' : d.retention.pct >= 60 ? 'flat' : 'bad'} />

        <Kpi n="5" label="Trial conversion" value={d.trials.conversionPct != null ? `${d.trials.conversionPct}%` : '—'} sub={`${d.trials.onRoll} trials on the roll now`} tone="flat" />
        <Kpi n="6" label="Lifetime value" value={money(d.value.lifetimeValue)} sub={`${money(d.value.avgWeeklyFee)}/wk avg × 2 yrs`} tone="flat" />
        <Kpi n="7" label="Attended this week" value={String(d.attendance.thisWeek)} sub={`${d.attendance.delta >= 0 ? '+' : ''}${d.attendance.delta} vs last week`} tone={d.attendance.delta >= 0 ? 'good' : 'bad'} />
        <Kpi n="8" label="Coaches" value={String(d.team.coaches)} sub={d.team.credentialsExpiring ? `${d.team.credentialsExpiring} credential(s) expiring` : 'all credentials current'} tone={d.team.credentialsExpiring ? 'bad' : 'good'} />

        <Kpi n="9" label="Satellites open" value={`${d.satellites.open} / ${d.satellites.target}`} sub={`${d.satellites.launchReady} ready · ${d.satellites.testing} testing`} tone="brand" />
        <Kpi n="10" label="On the radar" value={String(d.radar.length)} sub={`${d.satellites.researching} being researched`} tone="flat" />
        <Kpi n="11" label="Stadium Fund" value={money(d.stadiumFund.total)} sub={`${d.stadiumFund.pct}% of ${money(d.stadiumFund.goal)}`} tone="brand" />
        <Kpi n="12" label="Weekly net" value={`${d.growth.weeklyNet >= 0 ? '+' : ''}${d.growth.weeklyNet}`} sub="students, last 7 days" tone={d.growth.weeklyNet >= 0 ? 'good' : 'bad'} />
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Radar */}
        <section className="bg-white rounded-2xl border border-zinc-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-zinc-900">📡 BigStar Radar</h2>
            <a href="/expansion" className="text-sm font-bold text-[#D72027] hover:underline">Open the radar →</a>
          </div>
          {!d.hasRadar ? (
            <p className="text-sm text-zinc-500">Paste <strong>schema/059_bigstar_radar.sql</strong> in Supabase to switch the expansion system on.</p>
          ) : d.radar.length === 0 ? (
            <p className="text-sm text-zinc-500">No suburbs on the radar yet — open the radar and add your first target.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {d.radar.map((r) => {
                const ui = STATUS_UI[r.status] ?? STATUS_UI.research!
                return (
                  <li key={r.name} className="flex items-center gap-3 py-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${ui.dot}`} />
                    <span className="font-bold text-zinc-800 flex-1">{r.name}</span>
                    <span className="text-[10px] font-black tracking-wider text-zinc-500">{ui.label}</span>
                    <span className="font-black tabular-nums text-zinc-900 w-9 text-right">{r.score ?? '–'}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Stadium fund */}
        <section className="bg-white rounded-2xl border border-zinc-200 p-5">
          <h2 className="font-black text-zinc-900 mb-1">🏟️ The Stadium Fund</h2>
          <p className="text-sm text-zinc-500 mb-3">Money goes in. It never comes out. Watching it grow keeps the dream real.</p>
          <div className="text-4xl font-black text-zinc-900 tabular-nums">{money(d.stadiumFund.total)}</div>
          <div className="mt-2 h-3 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#D72027] to-[#FFC107] rounded-full" style={{ width: `${Math.max(1, Math.min(100, d.stadiumFund.pct))}%` }} />
          </div>
          <div className="text-xs text-zinc-500 mt-1.5">
            {d.stadiumFund.pct}% of {money(d.stadiumFund.goal)}
            {d.stadiumFund.lastAdded && <> · last added {d.stadiumFund.lastAdded}</>}
          </div>
          <div className="mt-4"><StadiumFundAdd /></div>
        </section>
      </div>
    </DashboardShell>
  )
}

function Kpi({ n, label, value, sub, tone }: { n: string; label: string; value: string; sub: string; tone: 'brand' | 'good' | 'bad' | 'flat' }) {
  const c = tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : tone === 'brand' ? 'text-[#D72027]' : 'text-zinc-900'
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-4 h-4 rounded bg-zinc-100 text-zinc-500 text-[9px] font-black flex items-center justify-center">{n}</span>
        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{label}</span>
      </div>
      <div className={`text-2xl font-black tabular-nums ${c}`}>{value}</div>
      <div className="text-[11px] text-zinc-400 mt-0.5 leading-tight">{sub}</div>
    </div>
  )
}
