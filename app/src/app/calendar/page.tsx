import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { CalendarMonth, type ApptRow, type ClassRow } from '@/components/calendar-month'
import type { ApptCoach } from '@/components/appointment-modal'

export default async function CalendarPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const isManager = user.role === 'owner' || user.role === 'manager'

  // 1. All scheduled appointments (the diary). Wide window — full 2026–2029.
  const { data: appts, error: apptErr } = await supabase
    .from('appointments')
    .select(`
      id, title, type, start_at, end_at, all_day, location, description, notes, fee, assigned_coach_id,
      coach:coaches!appointments_assigned_coach_id_fkey ( full_name )
    `)
    .eq('status', 'scheduled')
    .gte('start_at', '2025-12-01T00:00:00Z')
    .order('start_at', { ascending: true })

  const appointments: ApptRow[] = (appts ?? []).map((a) => {
    const coach = Array.isArray(a.coach) ? a.coach[0] : a.coach
    return {
      id: a.id, title: a.title, type: a.type, start_at: a.start_at, end_at: a.end_at,
      all_day: a.all_day ?? false, location: a.location, description: a.description ?? null,
      notes: a.notes, fee: a.fee, assigned_coach_id: a.assigned_coach_id,
      coach_name: coach?.full_name ?? null,
    }
  })

  // 2. Active classes (weekly recurring) — coaches see only theirs.
  let classQuery = supabase
    .from('classes')
    .select(`
      id, name, discipline, day_of_week, start_time, duration_minutes,
      primary_coach:coaches!classes_primary_coach_id_fkey ( full_name )
    `)
    .eq('status', 'active')

  if (user.role === 'coach') {
    const { data: coachRow } = await supabase.from('coaches').select('id, role').eq('user_id', user.id).maybeSingle()
    if (!coachRow) classQuery = classQuery.eq('primary_coach_id', '00000000-0000-0000-0000-000000000000')
    else if (coachRow.role !== 'head') classQuery = classQuery.eq('primary_coach_id', coachRow.id).neq('discipline', 'private')
  }
  const { data: rawClasses } = await classQuery

  const classes: ClassRow[] = (rawClasses ?? []).map((c) => {
    const coach = Array.isArray(c.primary_coach) ? c.primary_coach[0] : c.primary_coach
    return {
      id: c.id, name: c.name, discipline: c.discipline, day_of_week: c.day_of_week,
      start_time: c.start_time, duration_minutes: c.duration_minutes, coach_name: coach?.full_name ?? null,
    }
  })

  // 3. Coaches for the add/edit form (managers only).
  let coaches: ApptCoach[] = []
  if (isManager) {
    const { data: cs } = await supabase.from('coaches').select('id, full_name').order('full_name')
    coaches = (cs ?? []) as ApptCoach[]
  }

  const needsSetup = apptErr?.message?.includes('appointments')

  return (
    <DashboardShell
      user={user}
      currentPath="/calendar"
      pageTitle="Calendar"
      pageSubtitle="Your diary — classes, shows, gigs, lessons, events. Click any day to add."
    >
      {needsSetup && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm mb-4">
          Calendar events need a one-time setup in the database before they can be saved. The schedule below still works —
          ask Jacky to finish the &ldquo;appointments&rdquo; setup.
        </div>
      )}
      <CalendarMonth appointments={appointments} classes={classes} coaches={coaches} isManager={isManager} />
    </DashboardShell>
  )
}
