import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { NextUpBanner } from '@/components/calendar-view'
import { expandClass, type CalendarItem } from '@/lib/calendar'
import {
  Inbox, Users, Baby, Tent, Target,
  Sparkles, Send, ClipboardList, UserPlus, Megaphone,
  ArrowRight, Activity, Bot,
  type LucideIcon,
} from 'lucide-react'

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

  // Window for "today" Jacky activity — Brisbane midnight to now
  const brisbaneMidnight = (() => {
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Brisbane', year: 'numeric', month: '2-digit', day: '2-digit' })
    const today = fmt.format(new Date())
    return new Date(`${today}T00:00:00+10:00`).toISOString()
  })()

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString()

  const [
    classesResult,
    familyCountRes,
    studentCountRes,
    classCountRes,
    leadCountRes,
    upcomingApptsRes,
    allClassesRes,
    pendingActionsCountRes,
    recentLeadsRes,
    jackyTodayRes,
    lastTriageRes,
  ] = await Promise.all([
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
    supabase.from('pending_actions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase
      .from('email_messages')
      .select('id, from_email, from_name, subject, received_at, classification, classification_confidence')
      .gte('received_at', sevenDaysAgo)
      .in('classification', ['trial_enquiry', 'birthday_party', 'ndis_enquiry', 'school_gig', 'corporate_gig', 'other'])
      .order('received_at', { ascending: false })
      .limit(6),
    supabase
      .from('agent_activity')
      .select('emails_read, drafts_created, ai_cost_usd, finished_at, status')
      .gte('finished_at', brisbaneMidnight)
      .order('finished_at', { ascending: false }),
    supabase
      .from('agent_activity')
      .select('finished_at, status')
      .order('finished_at', { ascending: false })
      .limit(1),
  ])

  const classes = classesResult.data ?? []
  const classError = classesResult.error

  // Roll up Jacky's day for the activity card
  const jackyToday = (jackyTodayRes.data ?? []).reduce(
    (acc, r) => ({
      emailsRead: acc.emailsRead + (r.emails_read ?? 0),
      draftsCreated: acc.draftsCreated + (r.drafts_created ?? 0),
      costUsd: acc.costUsd + Number(r.ai_cost_usd ?? 0),
      runs: acc.runs + 1,
      failures: acc.failures + (r.status === 'failure' ? 1 : 0),
    }),
    { emailsRead: 0, draftsCreated: 0, costUsd: 0, runs: 0, failures: 0 }
  )
  const lastTriageAt = lastTriageRes.data?.[0]?.finished_at ?? null
  const lastTriageStatus = lastTriageRes.data?.[0]?.status ?? null
  const minutesSinceLastTriage = lastTriageAt
    ? Math.floor((Date.now() - new Date(lastTriageAt).getTime()) / 60_000)
    : null
  const jackyAlive = minutesSinceLastTriage !== null && minutesSinceLastTriage < 30 && lastTriageStatus !== 'failure'
  const recentLeads = recentLeadsRes.data ?? []
  const pendingCount = pendingActionsCountRes.count ?? 0

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
      pageTitle={`${greeting()}, ${firstName(user.fullName, user.email)}`}
      pageSubtitle={`It's ${DAY_NAMES[today]} — here's what's on today.`}
      pageActions={
        <a
          href="/roll-call"
          className="inline-flex items-center gap-2 bg-[#D72027] hover:bg-[#A0151B] text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm hover:shadow transition-colors"
        >
          Open Roll Call →
        </a>
      }
    >
      <div className="space-y-8">
        {/* Next up banner (only when something is upcoming in the next 6h) */}
        {nextUp && <NextUpBanner item={nextUp} now={now} />}

        {/* KPI tiles */}
        <section data-tour="kpi-row" className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          <div data-tour="kpi-pending">
          <KpiTile
            icon={<Inbox size={22} strokeWidth={1.75} />}
            label="Pending approval"
            value={pendingCount}
            accent="from-[#D72027] to-[#A0151B]"
            href="/inbox?filter=pending"
            pulse={pendingCount > 0}
          />
          </div>
          <KpiTile
            icon={<Users size={22} strokeWidth={1.75} />}
            label="Contacts"
            value={familyCountRes.count ?? 0}
            accent="from-pink-500 to-rose-600"
            href="/contacts"
          />
          <KpiTile
            icon={<Baby size={22} strokeWidth={1.75} />}
            label="Students"
            value={studentCountRes.count ?? 0}
            accent="from-amber-500 to-amber-600"
            href="/students"
          />
          <KpiTile
            icon={<Tent size={22} strokeWidth={1.75} />}
            label="Active classes"
            value={classCountRes.count ?? 0}
            accent="from-blue-500 to-blue-700"
            href="/classes"
          />
          <KpiTile
            icon={<Target size={22} strokeWidth={1.75} />}
            label="Open leads"
            value={leadCountRes.count ?? 0}
            accent="from-emerald-500 to-emerald-700"
            href="/leads"
          />
        </section>

        {/* Two-column: today's classes + build progress */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Today's classes */}
          <div data-tour="todays-classes" className="xl:col-span-2">
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

          {/* Quick actions + Jacky status */}
          <aside className="space-y-5">
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <SectionHeader title="Quick actions" />
              <div className="space-y-0.5 -mx-2">
                <QuickAction href="/jacky"               icon={Sparkles}      label="Ask Jacky" />
                <QuickAction href="/inbox"               icon={Inbox}         label="Approval queue" />
                <QuickAction href="/marketing/social"    icon={Sparkles}      label="AI social post" />
                <QuickAction href="/marketing/bulk-send" icon={Send}          label="Bulk send (email or SMS)" />
                <QuickAction href="/roll-call"           icon={ClipboardList} label="Take attendance" />
                <QuickAction href="/contacts"            icon={UserPlus}      label="Add a new contact" />
                <QuickAction href="/marketing"           icon={Megaphone}     label="Plan a post" />
              </div>
            </div>

            {/* Jacky AI activity card */}
            <div data-tour="jacky-today" className="bg-zinc-950 text-white rounded-xl border border-zinc-900 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold tracking-tight flex items-center gap-2">
                    <Bot size={16} className="text-amber-400" />
                    Jacky AI activity
                  </h2>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium mt-0.5">
                    24/7 background worker
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded ${
                    jackyAlive ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30' : 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30'
                  }`}
                >
                  <Activity size={11} />
                  {jackyAlive ? 'Live' : minutesSinceLastTriage === null ? 'Unknown' : 'Stale'}
                </span>
              </div>
              <ul className="space-y-2.5 text-sm">
                <Stat label="Emails read"     value={jackyToday.emailsRead} />
                <Stat label="Drafts queued"   value={jackyToday.draftsCreated} />
                <Stat label="Triage runs"     value={jackyToday.runs} />
                <li className="flex justify-between border-t border-zinc-900 pt-3 mt-3">
                  <span className="text-zinc-400 text-xs">AI spend today</span>
                  <span className="font-semibold tabular-nums">${jackyToday.costUsd.toFixed(2)}</span>
                </li>
              </ul>
              {minutesSinceLastTriage !== null && (
                <p className="text-[10px] text-zinc-500 mt-3">
                  Last triage: {minutesSinceLastTriage < 1 ? 'just now' : `${minutesSinceLastTriage} min ago`}
                </p>
              )}
            </div>
          </aside>
        </section>

        {/* Recent leads — the highest-intent emails Jacky's seen in last 7 days */}
        {recentLeads.length > 0 && (
          <section>
            <SectionHeader
              title="Recent leads"
              subtitle={`Last ${Math.min(recentLeads.length, 6)} high-intent emails to admin@`}
              action={
                <a href="/leads" className="text-xs font-bold text-[#D72027] hover:underline">
                  All leads →
                </a>
              }
            />
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {recentLeads.map((lead) => (
                <li
                  key={lead.id}
                  className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4 sm:p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">{LEAD_EMOJI[lead.classification ?? 'other'] ?? '✨'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#D72027]">
                          {(lead.classification ?? 'other').replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {relativeTime(lead.received_at)}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-zinc-900 mt-0.5 truncate">
                        {lead.from_name ?? lead.from_email ?? 'Unknown sender'}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5 truncate">{lead.subject ?? '(no subject)'}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </DashboardShell>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function KpiTile({
  icon,
  label,
  value,
  accent,
  href,
  pulse,
}: {
  icon: string | React.ReactNode
  label: string
  value: number
  accent: string
  href?: string
  pulse?: boolean
}) {
  const inner = (
    <>
      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${accent}`} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-1.5">
            {label}
          </div>
          <div className={`text-3xl font-bold text-zinc-900 leading-none tracking-tight ${pulse ? 'animate-pulse' : ''}`}>
            {value}
          </div>
        </div>
        <span className="text-zinc-300 group-hover:text-zinc-600 transition-colors">{icon}</span>
      </div>
    </>
  )
  const baseClass = 'group bg-white rounded-xl border border-zinc-200 p-5 relative overflow-hidden'
  if (href) {
    return (
      <a href={href} className={`${baseClass} hover:border-zinc-300 hover:shadow-md transition-all block`}>
        {inner}
      </a>
    )
  }
  return <div className={baseClass}>{inner}</div>
}

const LEAD_EMOJI: Record<string, string> = {
  trial_enquiry: '🎯',
  birthday_party: '🎉',
  ndis_enquiry: '💜',
  school_gig: '🏫',
  corporate_gig: '🏢',
  cancel_or_pause: '⏸',
  invoice_question: '💳',
  existing_parent: '👨‍👩‍👧',
  other: '✨',
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
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

function QuickAction({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <a
      href={href}
      className="group flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-zinc-50 text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-colors"
    >
      <span className="w-8 h-8 rounded-md bg-zinc-100 text-zinc-600 group-hover:bg-[#D72027] group-hover:text-white flex items-center justify-center transition-colors">
        <Icon size={15} strokeWidth={2} />
      </span>
      <span className="flex-1">{label}</span>
      <ArrowRight size={14} className="text-zinc-300 group-hover:text-zinc-600 transition-colors" />
    </a>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-baseline justify-between">
      <span className="text-zinc-400 text-xs">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
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
