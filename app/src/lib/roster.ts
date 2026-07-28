import 'server-only'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { getWorkshops, getKidsNightOut, getRosterCoaches, type WorkshopWithCounts, type RosterCoach } from '@/lib/workshops'

export type StaffLite = { id: string; coach_id: string | null; coach_name: string | null; role: string }
export type RosterClass = {
  id: string; name: string; day_of_week: number; start_time: string; duration_minutes: number | null
  primary_coach_name: string | null; staff: StaffLite[]
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export async function getRoster(): Promise<{
  classes: RosterClass[]; workshops: WorkshopWithCounts[]; kno: WorkshopWithCounts[]; coaches: RosterCoach[]
}> {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const { data: cls } = await supabase.from('classes')
    .select('id, name, day_of_week, start_time, duration_minutes, primary_coach:coaches!classes_primary_coach_id_fkey(full_name)')
    .eq('tenant_id', user.tenantId).order('day_of_week').order('start_time')

  const { data: staff } = await supabase.from('class_staff')
    .select('id, class_id, coach_id, coach_name, role').eq('tenant_id', user.tenantId)
  const byClass = new Map<string, StaffLite[]>()
  for (const s of (staff ?? []) as Array<StaffLite & { class_id: string }>) {
    const a = byClass.get(s.class_id) ?? []; a.push(s); byClass.set(s.class_id, a)
  }

  const classes: RosterClass[] = ((cls ?? []) as Array<Record<string, unknown>>).map((c) => {
    const pc = c.primary_coach as { full_name?: string } | Array<{ full_name?: string }> | null
    const primary = Array.isArray(pc) ? pc[0]?.full_name : pc?.full_name
    return {
      id: c.id as string, name: c.name as string, day_of_week: Number(c.day_of_week),
      start_time: c.start_time as string, duration_minutes: (c.duration_minutes as number) ?? null,
      primary_coach_name: primary ?? null, staff: byClass.get(c.id as string) ?? [],
    }
  })

  const [workshops, kno, coaches] = await Promise.all([getWorkshops(), getKidsNightOut(), getRosterCoaches()])
  return { classes, workshops: (workshops ?? []).filter((w) => w.status !== 'cancelled'), kno: (kno ?? []).filter((w) => w.status !== 'cancelled'), coaches }
}
