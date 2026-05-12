import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'

type ClassRow = {
  id: string
  name: string
  day_of_week: number
  start_time: string
  duration_minutes: number
  discipline: string
  age_min: number | null
  age_max: number | null
  capacity: number
  weekly_fee: number | null
  primary_coach: { full_name: string } | null
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function todayInBrisbane() {
  // BSC runs on AEST (Brisbane = UTC+10, no DST). Get the right day-of-week
  // regardless of where the server is.
  const now = new Date()
  const brisbane = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Brisbane' }))
  return brisbane.getDay() // 0=Sun, 6=Sat
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

export default async function DashboardPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const today = todayInBrisbane()

  const { data: classes, error } = await supabase
    .from('classes')
    .select(`
      id, name, day_of_week, start_time, duration_minutes,
      discipline, age_min, age_max, capacity, weekly_fee,
      primary_coach:coaches!classes_primary_coach_id_fkey ( full_name )
    `)
    .eq('day_of_week', today)
    .eq('status', 'active')
    .order('start_time', { ascending: true })
    .returns<ClassRow[]>()

  // Pull a tenant-wide snapshot for the stat tiles.
  const [
    { count: familyCount },
    { count: studentCount },
    { count: classCount },
  ] = await Promise.all([
    supabase.from('families').select('id', { count: 'exact', head: true }),
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('classes').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ])

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <section>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
          {greeting()}, {firstName(user.fullName, user.email)} 👋
        </h1>
        <p className="text-zinc-600 mt-1">
          It&apos;s {DAY_NAMES[today]}. Here&apos;s what&apos;s on today.
        </p>
      </section>

      {/* Snapshot tiles */}
      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatTile icon="👨‍👩‍👧" label="Families" value={familyCount ?? 0} />
        <StatTile icon="🧒" label="Students" value={studentCount ?? 0} />
        <StatTile icon="📅" label="Active classes" value={classCount ?? 0} />
      </section>

      {/* Today's classes */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900">Today&apos;s classes</h2>
          <a
            href="/roll-call"
            className="text-sm font-bold text-[#D72027] hover:underline hidden sm:inline"
          >
            Open Roll Call →
          </a>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl px-4 py-3 text-sm">
            Couldn&apos;t load classes: {error.message}
          </div>
        )}

        {!error && (!classes || classes.length === 0) && (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center text-zinc-500">
            <div className="text-5xl mb-3">🌴</div>
            <p className="font-bold text-zinc-700">No classes scheduled for {DAY_NAMES[today]}.</p>
            <p className="text-sm mt-1">Enjoy the day off.</p>
          </div>
        )}

        {!error && classes && classes.length > 0 && (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {classes.map((c) => (
              <li
                key={c.id}
                className="bg-white rounded-2xl shadow-md p-5 border-l-4 border-[#FFC107] hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{DISCIPLINE_EMOJI[c.discipline] || '🎪'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-lg font-extrabold text-zinc-900 truncate">
                        {formatTime(c.start_time)}
                      </span>
                      <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold">
                        {c.duration_minutes} min
                      </span>
                    </div>
                    <div className="text-sm font-bold text-zinc-800 mt-1">{c.name}</div>
                    <div className="text-xs text-zinc-500 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      {(c.age_min || c.age_max) && (
                        <span>
                          Ages {c.age_min ?? '?'}–{c.age_max ?? '?'}
                        </span>
                      )}
                      <span>Cap {c.capacity}</span>
                      {c.primary_coach?.full_name && (
                        <span>Coach: {c.primary_coach.full_name}</span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Slice 1 status */}
      <section className="bg-white rounded-2xl shadow-md p-6 border-t-4 border-[#D72027]">
        <h3 className="text-xs font-extrabold text-[#D72027] uppercase tracking-widest mb-3">
          Build Progress
        </h3>
        <ul className="space-y-2 text-sm">
          <li>✅ Slice 1 — Sign in + tenant + dashboard (you&apos;re here)</li>
          <li>⏳ Slice 2 — Roll Call on iPad (next)</li>
          <li>⏳ Slice 3 — Star Ledger</li>
          <li>⏳ Slice 4 — Stripe sync</li>
        </ul>
      </section>
    </div>
  )
}

function StatTile({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-4 sm:p-5">
      <div className="text-2xl sm:text-3xl mb-2">{icon}</div>
      <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 leading-none">{value}</div>
      <div className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-500 font-bold mt-1">
        {label}
      </div>
    </div>
  )
}

function greeting() {
  const h = parseInt(
    new Date().toLocaleString('en-US', { timeZone: 'Australia/Brisbane', hour: 'numeric', hour12: false }),
    10
  )
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function firstName(fullName: string | null, email: string) {
  if (fullName) return fullName.split(' ')[0]
  return email.split('@')[0]
}
