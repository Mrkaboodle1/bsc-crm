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

export default function DemoRollCall() {
  return (
    <DashboardShell
      user={demoUser}
      currentPath="/roll-call"
      pageTitle="Roll Call"
      pageSubtitle="Wednesday — tap a class to start. (Demo mode)"
    >
      <div className="space-y-6">
        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-5 py-3 text-sm text-amber-900">
          <strong>Demo mode</strong> — pick a class to try the iPad-optimised attendance grid. Tap to cycle status, tap ⭐ to award stars.
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {demoTodayClasses.map((c) => {
            const status =
              c.enrolled === 0 ? 'empty' :
              c.marked === 0 ? 'unmarked' :
              c.marked >= c.enrolled ? 'complete' : 'partial'
            return (
              <li key={c.id}>
                <a
                  href={`/demo/roll-call/${c.id}`}
                  className="block bg-white rounded-2xl shadow-sm border border-zinc-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-4xl">{DISCIPLINE_EMOJI[c.discipline] || '🎪'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-xl font-extrabold text-zinc-900">{formatTime(c.start_time)}</span>
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">{c.duration_minutes} min</span>
                      </div>
                      <div className="text-sm font-bold text-zinc-800 mt-1 truncate">{c.name}</div>
                      <div className="text-xs text-zinc-500 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                        {(c.age_min !== null || c.age_max !== null) && (
                          <span>Ages {c.age_min ?? '?'}–{c.age_max ?? '?'}</span>
                        )}
                        <span>Cap {c.capacity}</span>
                        <span>Coach: {c.coach}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-xs font-bold text-zinc-600 mb-1">
                        {c.marked} of {c.enrolled} marked
                      </div>
                      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            status === 'complete' ? 'bg-emerald-500' :
                            status === 'partial' ? 'bg-amber-500' : 'bg-zinc-300'
                          }`}
                          style={{ width: c.enrolled === 0 ? '0%' : `${(c.marked / c.enrolled) * 100}%` }}
                          aria-hidden
                        />
                      </div>
                    </div>
                    <StatusPill status={status} />
                  </div>
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </DashboardShell>
  )
}

function StatusPill({ status }: { status: 'empty' | 'unmarked' | 'partial' | 'complete' }) {
  const map = {
    empty: { label: 'No enrolments', cls: 'bg-zinc-100 text-zinc-500' },
    unmarked: { label: 'Not started', cls: 'bg-amber-100 text-amber-800' },
    partial: { label: 'In progress', cls: 'bg-blue-100 text-blue-800' },
    complete: { label: 'Done', cls: 'bg-emerald-100 text-emerald-800' },
  }
  const { label, cls } = map[status]
  return <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
}
