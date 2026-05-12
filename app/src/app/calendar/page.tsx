import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { CalendarView } from '@/components/calendar-view'
import { expandClass, type CalendarItem } from '@/lib/calendar'

export default async function CalendarPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const now = new Date()

  // Window: now → +14 days
  const horizon = new Date(now.getTime() + 14 * 86_400_000)

  // 1. Upcoming appointments
  const { data: appts, error: apptErr } = await supabase
    .from('appointments')
    .select(`
      id, title, type, start_at, end_at, location, notes,
      alert_minutes_before, fee, paid, status,
      coach:coaches!appointments_assigned_coach_id_fkey ( id, full_name ),
      family:families!appointments_related_family_id_fkey ( id, family_name ),
      student:students!appointments_related_student_id_fkey ( id, first_name, last_name )
    `)
    .gte('end_at', now.toISOString())
    .lte('start_at', horizon.toISOString())
    .eq('status', 'scheduled')
    .order('start_at', { ascending: true })

  // 2. Active classes — expand into one occurrence per matching day in the window
  const { data: classes } = await supabase
    .from('classes')
    .select(`
      id, name, discipline, day_of_week, start_time, duration_minutes,
      primary_coach:coaches!classes_primary_coach_id_fkey ( full_name )
    `)
    .eq('status', 'active')

  const items: CalendarItem[] = []

  // Map appointments → CalendarItem
  for (const a of appts ?? []) {
    const coach = Array.isArray(a.coach) ? a.coach[0] : a.coach
    const fam = Array.isArray(a.family) ? a.family[0] : a.family
    const stu = Array.isArray(a.student) ? a.student[0] : a.student
    items.push({
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
      href: fam ? `/families/${fam.id}` : null,
    })
  }

  // Expand classes into the next 14 days
  if (classes && classes.length > 0) {
    for (let d = 0; d < 14; d++) {
      const day = new Date(now.getTime() + d * 86_400_000)
      // Brisbane day-of-week
      const brisDay = parseInt(day.toLocaleString('en-US', { timeZone: 'Australia/Brisbane', weekday: 'long' }) === 'Sunday' ? '0' : '', 10)
      // Easier: get day-of-week reliably
      const brisDow = brisbaneDayOfWeek(day)
      for (const c of classes) {
        if (c.day_of_week === brisDow) {
          const occ = expandClass(c as any, day)
          // Only include occurrences strictly in [now, horizon]
          if (occ.end.getTime() >= now.getTime() && occ.start.getTime() <= horizon.getTime()) {
            items.push(occ)
          }
        }
      }
    }
  }

  // Sort all
  items.sort((a, b) => a.start.getTime() - b.start.getTime())

  return (
    <DashboardShell
      user={user}
      currentPath="/calendar"
      pageTitle="Calendar"
      pageSubtitle="Next 14 days — classes, shows, lessons, parties, personal."
      pageActions={
        <a
          href="/calendar/new"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg"
        >
          ➕ Add appointment
        </a>
      }
    >
      {apptErr && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl px-4 py-3 text-sm mb-4">
          Couldn&apos;t load appointments: {apptErr.message}
        </div>
      )}
      <CalendarView items={items} now={now} />
    </DashboardShell>
  )
}

function brisbaneDayOfWeek(d: Date): number {
  // Returns 0-6 (Sun-Sat) for a date as seen in Brisbane timezone.
  const weekday = d.toLocaleString('en-US', { timeZone: 'Australia/Brisbane', weekday: 'short' })
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[weekday] ?? 0
}
