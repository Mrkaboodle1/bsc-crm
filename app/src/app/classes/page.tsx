import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { ClassFormButton, type Coach } from '@/components/class-form'
import { ClassesList, type ClassListRow } from '@/components/classes-list'

type Row = ClassListRow & { primary_coach: { full_name: string } | { full_name: string }[] | null }

export default async function ClassesPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const [{ data: classes }, { data: coaches }] = await Promise.all([
    supabase.from('classes').select('id, name, discipline, day_of_week, start_time, duration_minutes, age_min, age_max, capacity, weekly_fee, primary_coach_id, primary_coach:coaches!classes_primary_coach_id_fkey(full_name)').eq('status', 'active').order('day_of_week').order('start_time').returns<Row[]>(),
    supabase.from('coaches').select('id, full_name').order('full_name').returns<Coach[]>(),
  ])
  const coachList = coaches ?? []
  const rows: ClassListRow[] = (classes ?? []).map((c) => {
    const coach = Array.isArray(c.primary_coach) ? c.primary_coach[0] : c.primary_coach
    return {
      id: c.id, name: c.name, discipline: c.discipline, day_of_week: c.day_of_week,
      start_time: c.start_time, duration_minutes: c.duration_minutes, age_min: c.age_min,
      age_max: c.age_max, capacity: c.capacity, weekly_fee: c.weekly_fee,
      primary_coach_id: c.primary_coach_id, coach_name: coach?.full_name ?? null,
    }
  })

  return (
    <DashboardShell
      user={user}
      currentPath="/classes"
      pageTitle="Classes"
      pageSubtitle={`${rows.length} active classes & private lessons`}
      pageActions={<ClassFormButton coaches={coachList} />}
    >
      <ClassesList classes={rows} coaches={coachList} />
    </DashboardShell>
  )
}
