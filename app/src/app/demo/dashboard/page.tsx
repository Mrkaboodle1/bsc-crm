import { DashboardShell } from '@/components/dashboard-shell'
import { demoUser, demoTodayClasses } from '@/lib/demo-data'

const DISCIPLINE_EMOJI: Record<string, string> = {
  circus_acro: '🤸', aerial: '🎪', fusion: '✨', drama: '🎭',
  toddler: '🍼', homeschool: '📚', adult: '🏋️', ndis: '💜',
  private: '🔒', show_programme: '⭐',
}

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h, 10)
  const period = hour >= 12 ? 'pm' : 'am'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}:${m}${period}`
}

export default function DemoDashboard() {
  return (
    <DashboardShell
      user={demoUser}
      currentPath="/dashboard"
      pageTitle="Good morning, Rhett 👋"
      pageSubtitle="It's Wednesday — here's what's on today. (Demo mode)"
      pageActions={
        <a
          href="/demo/roll-call"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg"
        >
          📋 Open Roll Call
        </a>
      }
    >
      <div className="space-y-8">
        {/* Demo banner */}
        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-5 py-3 text-sm text-amber-900 flex items-center gap-2">
          <span className="text-lg">🎬</span>
          <span>
            <strong>Demo mode</strong> — mock data only, nothing saves.
            <a href="/login" className="ml-2 font-extrabold underline">Sign in</a> to use real data.
          </span>
        </div>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Kpi icon="👨‍👩‍👧" label="Families"        value={47} accent="from-[#D72027] to-[#A0151B]" />
          <Kpi icon="🧒"     label="Students"        value={78} accent="from-amber-500 to-amber-600" />
          <Kpi icon="📅"     label="Active classes"  value={18} accent="from-blue-500 to-blue-700" />
          <Kpi icon="🎯"     label="Open leads"      value={6}  accent="from-emerald-500 to-emerald-700" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <div className="flex items-end justify-between mb-3">
              <div>
                <h2 className="text-lg font-extrabold text-zinc-900">Today&apos;s classes</h2>
                <p className="text-xs text-zinc-500">{demoTodayClasses.length} on Wednesday</p>
              </div>
              <a href="/demo/roll-call" className="text-xs font-bold text-[#D72027] hover:underline">
                Open Roll Call →
              </a>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {demoTodayClasses.map((c) => (
                <li key={c.id} className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{DISCIPLINE_EMOJI[c.discipline] || '🎪'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-extrabold text-zinc-900">{formatTime(c.start_time)}</span>
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">{c.duration_minutes} min</span>
                      </div>
                      <div className="text-sm font-bold text-zinc-800 mt-1">{c.name}</div>
                      <div className="text-xs text-zinc-500 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                        {(c.age_min !== null || c.age_max !== null) && (
                          <span>Ages {c.age_min ?? '?'}–{c.age_max ?? '?'}</span>
                        )}
                        <span>Cap {c.capacity}</span>
                        <span>Coach: {c.coach}</span>
                      </div>
                      <div className="text-[10px] mt-2">
                        <span className="bg-zinc-100 px-2 py-0.5 rounded font-bold text-zinc-600">
                          {c.marked}/{c.enrolled} marked
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <aside className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
              <h2 className="text-lg font-extrabold text-zinc-900 mb-3">Quick actions</h2>
              <div className="space-y-2">
                <QA href="/demo/roll-call" icon="📋" label="Take attendance" />
                <QA href="/families" icon="➕" label="Add a new family" />
                <QA href="/leads" icon="🎯" label="View leads" />
                <QA href="/marketing" icon="📣" label="Plan a post" />
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
              <h2 className="text-lg font-extrabold text-zinc-900 mb-3">Build progress</h2>
              <ul className="space-y-2.5 text-sm">
                <Row status="live" label="Slice 1 — Sign in + dashboard" />
                <Row status="live" label="Slice 2 — Roll Call on iPad ⭐" />
                <Row status="next" label="Slice 3 — Star Ledger" />
                <Row status="soon" label="Slice 4 — Stripe sync" />
                <Row status="soon" label="Slice 5 — Lead capture" />
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </DashboardShell>
  )
}

function Kpi({ icon, label, value, accent }: { icon: string; label: string; value: number; accent: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5 relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} aria-hidden />
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <div className="text-3xl font-extrabold text-zinc-900 leading-none">{value}</div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold mt-1">{label}</div>
        </div>
      </div>
    </div>
  )
}

function QA({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-50 text-sm font-bold text-zinc-700">
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
      <span className="ml-auto text-zinc-300">→</span>
    </a>
  )
}

function Row({ status, label }: { status: 'live' | 'next' | 'soon'; label: string }) {
  const dot = status === 'live' ? 'bg-emerald-500' : status === 'next' ? 'bg-amber-500 animate-pulse' : 'bg-zinc-300'
  const tag = status === 'live' ? 'bg-emerald-100 text-emerald-800' : status === 'next' ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-500'
  const tagText = status === 'live' ? 'LIVE' : status === 'next' ? 'NEXT' : 'SOON'
  return (
    <li className="flex items-center gap-3">
      <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
      <span className="text-zinc-700 flex-1">{label}</span>
      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${tag}`}>{tagText}</span>
    </li>
  )
}
