import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function todayInBrisbane() {
  const now = new Date()
  const brisbane = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Brisbane' }))
  return { dow: brisbane.getDay(), iso: brisbane.toISOString().slice(0, 10) }
}

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h, 10)
  const period = hour >= 12 ? 'pm' : 'am'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}:${m}${period}`
}

const DISCIPLINE_EMOJI: Record<string, string> = {
  circus_acro: '🤸',
  aerial: '🎪',
  fusion: '✨',
  drama: '🎭',
  toddler: '🍼',
  homeschool: '📚',
  adult: '🏋️',
  ndis: '💜',
  private: '🔒',
  show_programme: '⭐',
}

export default async function RollCallIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; all?: string }>
}) {
  const { day: dayParam, all } = await searchParams
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { dow: todayDow, iso } = todayInBrisbane()

  // If ?day=N supplied, use it. If ?all=1 supplied, show every active class.
  // Otherwise default to today's day-of-week.
  const showAll = all === '1'
  const dow = dayParam !== undefined ? parseInt(dayParam, 10) : todayDow
  const validDow = dow >= 0 && dow <= 6 ? dow : todayDow

  let query = supabase
    .from('classes')
    .select(`
      id, name, day_of_week, start_time, duration_minutes,
      discipline, age_min, age_max, capacity,
      primary_coach:coaches!classes_primary_coach_id_fkey ( full_name )
    `)
    .eq('status', 'active')
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })
  if (!showAll) query = query.eq('day_of_week', validDow)

  const { data: classes } = await query

  const classIds = (classes ?? []).map((c) => c.id)
  let enrolByClass: Record<string, number> = {}
  let attByClass: Record<string, number> = {}
  if (classIds.length > 0) {
    const [{ data: enrols }, { data: atts }] = await Promise.all([
      supabase.from('enrolments').select('class_id').eq('status', 'active').in('class_id', classIds),
      supabase.from('attendance').select('class_id').eq('date', iso).in('class_id', classIds),
    ])
    enrolByClass = (enrols ?? []).reduce<Record<string, number>>(
      (acc, r) => ((acc[r.class_id] = (acc[r.class_id] ?? 0) + 1), acc),
      {}
    )
    attByClass = (atts ?? []).reduce<Record<string, number>>(
      (acc, r) => ((acc[r.class_id] = (acc[r.class_id] ?? 0) + 1), acc),
      {}
    )
  }

  const dayHasClasses = (classes?.length ?? 0) > 0

  return (
    <DashboardShell
      user={user}
      currentPath="/roll-call"
      pageTitle="Roll Call"
      pageSubtitle={
        showAll
          ? `All active classes — tap one to start.`
          : `${DAY_NAMES[validDow]} — tap a class to start.`
      }
      pageActions={
        <a
          href={showAll ? '/roll-call' : '/roll-call?all=1'}
          className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
        >
          {showAll ? '← Today' : '📋 Show all classes'}
        </a>
      }
    >
      {/* Day picker — quick taps on iPad */}
      <div className="flex flex-wrap gap-2 mb-5">
        {DAY_NAMES.map((label, idx) => {
          const active = !showAll && idx === validDow
          const isToday = idx === todayDow
          return (
            <a
              key={idx}
              href={`/roll-call?day=${idx}`}
              className={`px-4 py-2.5 rounded-xl text-sm font-extrabold transition-colors ${
                active
                  ? 'bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white shadow-md'
                  : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              {label.slice(0, 3)}
              {isToday && <span className="ml-1 text-[10px] opacity-70">·today</span>}
            </a>
          )
        })}
      </div>

      {!dayHasClasses ? (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-10 text-center max-w-2xl">
          <div className="text-5xl mb-3">🌴</div>
          <p className="font-bold text-zinc-700">No classes on {DAY_NAMES[validDow]}.</p>
          <p className="text-sm text-zinc-500 mt-1">Pick another day above, or browse all classes.</p>
          <a
            href="/roll-call?all=1"
            className="inline-flex items-center gap-2 mt-4 bg-zinc-900 text-white font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-800"
          >
            Browse all classes
          </a>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {classes!.map((c) => {
            const enrolled = enrolByClass[c.id] ?? 0
            const marked = attByClass[c.id] ?? 0
            const status = enrolled === 0
              ? 'empty'
              : marked === 0
              ? 'unmarked'
              : marked >= enrolled
              ? 'complete'
              : 'partial'
            return (
              <li key={c.id}>
                <a
                  href={`/roll-call/${c.id}`}
                  className="block bg-white rounded-2xl shadow-sm border border-zinc-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-4xl">{DISCIPLINE_EMOJI[c.discipline] || '🎪'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-xl font-extrabold text-zinc-900">
                          {formatTime(c.start_time)}
                        </span>
                        {showAll && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#D72027]">
                            {DAY_NAMES[c.day_of_week].slice(0, 3)}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                          {c.duration_minutes} min
                        </span>
                      </div>
                      <div className="text-sm font-bold text-zinc-800 mt-1 truncate">{c.name}</div>
                      <div className="text-xs text-zinc-500 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                        {(c.age_min !== null || c.age_max !== null) && (
                          <span>Ages {c.age_min ?? '?'}–{c.age_max ?? '?'}</span>
                        )}
                        <span>Cap {c.capacity}</span>
                        {Array.isArray(c.primary_coach) && c.primary_coach.length > 0 ? (
                          <span>Coach: {c.primary_coach[0].full_name}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-xs font-bold text-zinc-600 mb-1">
                        {marked} of {enrolled} marked
                      </div>
                      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            status === 'complete'
                              ? 'bg-emerald-500'
                              : status === 'partial'
                              ? 'bg-amber-500'
                              : 'bg-zinc-300'
                          }`}
                          style={{ width: enrolled === 0 ? '0%' : `${(marked / enrolled) * 100}%` }}
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
      )}
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
