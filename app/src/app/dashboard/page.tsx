import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { NextUpBanner } from '@/components/calendar-view'
import { expandClass, type CalendarItem } from '@/lib/calendar'

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
  const now = new Date()
  const brisbane = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Brisbane' }))
  return brisbane.getDay()
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

  const now = new Date()
  const horizon = new Date(now.getTime() + 6 * 3600_000) // 6h window for "next up"

  const [classesResult, familyCountRes, studentCountRes, classCountRes, leadCountRes, upcomingApptsRes, allClassesRes] = await Promise.all([
    supabase
      .from('classes')
      .select(`
        id, name, day_of_week, start_time, duration_minutes,
        discipline, age_min, age_max, capacity, weekly_fee,
        primary_coach:coaches!classes_primary_coach_id_fkey ( full_name )
      `)
      .eq('day_of_week', today)
      .eq('status', 'active')
      .order('start_time', { ascending: true })
      .returns<ClassRow[]>(),
    supabase.from('families').select('id', { count: 'exact', head: true }),
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('classes').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('families').select('id', { count: 'exact', head: true }).eq('lifecycle_stage', 'lead'),
    supabase
      .from('appointments')
      .select(`
        id, title, type, start_at, end_at, location, notes, alert_minutes_before, fee, paid,
        coach:coaches!appointments_assigned_coach_id_fkey ( full_name ),
        family:families!appointments_related_family_id_fkey ( id, family_name ),
        student:students!appointments_related_student_id_fkey ( id, first_name, last_name )
      `)
      .gte('end_at', now.toISOString())
      .lte('start_at', horizon.toISOString())
      .eq('status', 'scheduled')
      .order('start_at', { ascending: true })
      .limit(1),
    supabase
      .from('classes')
      .select(`
        id, name, discipline, day_of_week, start_time, duration_minutes,
        primary_coach:coaches!classes_primary_coach_id_fkey ( full_name )
      `)
      .eq('status', 'active'),
  ])

  const classes = classesResult.data ?? []
  const classError = classesResult.error

  // Build "next up" candidate from BOTH appointments + recurring classes in next 6h
  const nextUpCandidates: CalendarItem[] = []
  for (const a of upcomingApptsRes.data ?? []) {
    const coach = Array.isArray(a.coach) ? a.coach[0] : a.coach
    const fam = Array.isArray(a.family) ? a.family[0] : a.family
    const stu = Array.isArray(a.student) ? a.student[0] : a.student
    nextUpCandidates.push({
      id: `appt-${a.id}`,
      kind: 'appointment',
      title: a.title,
      type: a.type,
      start: new Date(a.start_at),
      end: new Date(a.end_at),
      location: a.location,
      notes: a.notes,
      coach: coach?.full_name ?? null,
      family: fam ? { id: fam.id, name: fam.family_name } : null,
      student: stu ? { id: stu.id, firstName: stu.first_name, lastName: stu.last_name } : null,
      alertMinutesBefore: a.alert_minutes_before,
      fee: a.fee,
      paid: a.paid,
      href: '/calendar',
    })
  }
  // Today's classes expanded for the next 6h
  for (const c of allClassesRes.data ?? []) {
    if (c.day_of_week !== today) continue
    const occ = expandClass(c as any, now)
    if (occ.end.getTime() >= now.getTime() && occ.start.getTime() <= horizon.getTime()) {
      nextUpCandidates.push(occ)
    }
  }
  nextUpCandidates.sort((a, b) => a.start.getTime() - b.start.getTime())
  const nextUp = nextUpCandidates[0] ?? null

  return (
    <DashboardShell
      user={user}
      currentPath="/dashboard"
      pageTitle={`${greeting()}, ${firstName(user.fullName, user.email)} 👋`}
      pageSubtitle={`It's ${DAY_NAMES[today]} — here's what's on today.`}
      pageActions={
        <a
          href="/roll-call"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          📋 Open Roll Call
        </a>
      }
    >
      <div className="space-y-8">
        {/* Next up banner (only when something is upcoming in the next 6h) */}
        {nextUp && <NextUpBanner item={nextUp} now={now} />}

        {/* KPI tiles */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <KpiTile
            icon="👨‍👩‍👧"
            label="Families"
            value={familyCountRes.count ?? 0}
            accent="from-[#D72027] to-[#A0151B]"
          />
          <KpiTile
            icon="🧒"
            label="Students"
            value={studentCountRes.count ?? 0}
            accent="from-amber-500 to-amber-600"
          />
          <KpiTile
            icon="📅"
            label="Active classes"
            value={classCountRes.count ?? 0}
            accent="from-blue-500 to-blue-700"
          />
          <KpiTile
            icon="🎯"
            label="Open leads"
            value={leadCountRes.count ?? 0}
            accent="from-emerald-500 to-emerald-700"
          />
        </section>

        {/* Two-column: today's classes + build progress */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Today's classes */}
          <div className="xl:col-span-2">
            <SectionHeader
              title={`Today's classes`}
              subtitle={`${classes.length} on ${DAY_NAMES[today]}`}
              action={
                <a href="/calendar" className="text-xs font-bold text-[#D72027] hover:underline">
                  Full calendar →
                </a>
              }
            />
            {classError && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl px-4 py-3 text-sm">
                Couldn&apos;t load classes: {classError.message}
              </div>
            )}
            {!classError && classes.length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-10 text-center text-zinc-500">
                <div className="text-5xl mb-3">🌴</div>
                <p className="font-bold text-zinc-700">
                  No classes scheduled for {DAY_NAMES[today]}.
                </p>
                <p className="text-sm mt-1">Enjoy the day off.</p>
              </div>
            )}
            {!classError && classes.length > 0 && (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {classes.map((c) => (
                  <li
                    key={c.id}
                    className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4 sm:p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{DISCIPLINE_EMOJI[c.discipline] || '🎪'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-lg font-extrabold text-zinc-900">
                            {formatTime(c.start_time)}
                          </span>
                          <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                            {c.duration_minutes} min
                          </span>
                        </div>
                        <div className="text-sm font-bold text-zinc-800 mt-1">{c.name}</div>
                        <div className="text-xs text-zinc-500 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                          {(c.age_min !== null || c.age_max !== null) && (
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
          </div>

          {/* Build progress + quick actions */}
          <aside className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
              <SectionHeader title="Quick actions" />
              <div className="space-y-2">
                <QuickAction href="/roll-call" icon="📋" label="Take attendance" />
                <QuickAction href="/families" icon="➕" label="Add a new family" />
                <QuickAction href="/leads" icon="🎯" label="View leads" />
                <QuickAction href="/marketing" icon="📣" label="Plan a post" />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
              <SectionHeader title="Build progress" />
              <ul className="space-y-2.5 text-sm">
                <BuildRow status="live" label="Slice 1 — Sign in + dashboard" />
                <BuildRow status="next" label="Slice 2 — Roll Call on iPad ⭐" />
                <BuildRow status="soon" label="Slice 3 — Star Ledger" />
                <BuildRow status="soon" label="Slice 4 — Stripe sync" />
                <BuildRow status="soon" label="Slice 5 — Lead capture" />
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </DashboardShell>
  )
}

function KpiTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: string
  label: string
  value: number
  accent: string
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4 sm:p-5 relative overflow-hidden">
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`}
        aria-hidden
      />
      <div className="flex items-center gap-3">
        <span className="text-2xl sm:text-3xl">{icon}</span>
        <div>
          <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 leading-none">
            {value}
          </div>
          <div className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-500 font-bold mt-1">
            {label}
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div>
        <h2 className="text-lg font-extrabold text-zinc-900">{title}</h2>
        {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function QuickAction({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-50 text-sm font-bold text-zinc-700 hover:text-zinc-900 transition-colors"
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
      <span className="ml-auto text-zinc-300">→</span>
    </a>
  )
}

function BuildRow({ status, label }: { status: 'live' | 'next' | 'soon'; label: string }) {
  const dot =
    status === 'live'
      ? 'bg-emerald-500'
      : status === 'next'
      ? 'bg-amber-500 animate-pulse'
      : 'bg-zinc-300'
  const tag =
    status === 'live'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'next'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-zinc-100 text-zinc-500'
  const tagText = status === 'live' ? 'LIVE' : status === 'next' ? 'NEXT' : 'SOON'
  return (
    <li className="flex items-center gap-3">
      <span className={`inline-block w-2 h-2 rounded-full ${dot}`} aria-hidden />
      <span className="text-zinc-700 flex-1">{label}</span>
      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${tag}`}>{tagText}</span>
    </li>
  )
}

function greeting() {
  const h = parseInt(
    new Date().toLocaleString('en-US', {
      timeZone: 'Australia/Brisbane',
      hour: 'numeric',
      hour12: false,
    }),
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
