import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

// The loyalty ladder. Resets each calendar year. Edit here to change thresholds
// or rewards — the rest of the system reads from this.
export const MILESTONES: Array<{ classes: number; label: string; reward: string; emoji: string }> = [
  { classes: 10, label: 'Term milestone', reward: 'Certificate + badge', emoji: '📜' },
  { classes: 20, label: 'Half-year milestone', reward: 'Free BSC water bottle or t-shirt', emoji: '🎽' },
  { classes: 40, label: 'Full-year milestone', reward: 'Free Holiday Workshop day + medal at the showcase + 2 weeks free on renewal (one per family)', emoji: '🏅' },
]
export const rewardFor = (m: number): string => MILESTONES.find((x) => x.classes === m)?.reward || ''

// Statuses on the roll that count as "attended".
const ATTENDED = ['present', 'late', 'makeup']

// Brisbane (UTC+10, no daylight saving) current year.
export const currentYear = (): number => new Date(Date.now() + 10 * 3600 * 1000).getUTCFullYear()

export async function countAttended(sb: SupabaseClient, tenantId: string, studentId: string, year: number): Promise<number> {
  const { count } = await sb.from('attendance').select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId).eq('student_id', studentId).in('status', ATTENDED)
    .gte('date', `${year}-01-01`).lte('date', `${year}-12-31`)
  return count ?? 0
}

export const nextMilestone = (count: number): { classes: number; label: string; reward: string; emoji: string } | null =>
  MILESTONES.find((m) => count < m.classes) ?? null

// Detect & record any milestones a student has newly reached this year.
// Idempotent thanks to the unique (student, milestone, year) constraint.
// Returns the milestone numbers that were newly recorded.
export async function detectForStudent(sb: SupabaseClient, tenantId: string, studentId: string): Promise<number[]> {
  const year = currentYear()
  const n = await countAttended(sb, tenantId, studentId, year)
  const reached = MILESTONES.filter((m) => n >= m.classes).map((m) => m.classes)
  if (!reached.length) return []
  const { data: have } = await sb.from('reward_milestones').select('milestone').eq('student_id', studentId).eq('year', year)
  const haveSet = new Set((have ?? []).map((r) => r.milestone as number))
  const toAdd = reached.filter((m) => !haveSet.has(m))
  if (!toAdd.length) return []
  await sb.from('reward_milestones').upsert(
    toAdd.map((m) => ({ tenant_id: tenantId, student_id: studentId, milestone: m, year, status: 'reached' as const })),
    { onConflict: 'student_id,milestone,year' },
  )
  return toAdd
}
