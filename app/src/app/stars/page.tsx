import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { StarLedgerView } from '@/components/star-ledger-view'
import type { DemoLedgerEntry } from '@/lib/demo-data'

const REASON_LABELS_SAFE = new Set([
  'skill_milestone', 'discipline', 'attendance', 'google_review',
  'social_tag', 'referral', 'showcase', 'other',
])

export default async function StarsPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  // Last 7 days, last 20 entries
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoIso = weekAgo.toISOString().slice(0, 10)

  const [
    { data: weekly },
    { data: recent },
    { data: tierGroups },
  ] = await Promise.all([
    supabase
      .from('star_ledger')
      .select('stars, student_id')
      .gte('awarded_at', weekAgoIso),
    supabase
      .from('star_ledger')
      .select(`
        id, stars, reason, notes, awarded_at,
        student:students!star_ledger_student_id_fkey (first_name, last_name),
        coach:coaches!star_ledger_awarded_by_coach_id_fkey (full_name)
      `)
      .order('awarded_at', { ascending: false })
      .limit(20)
      .returns<Array<{
        id: string
        stars: number
        reason: string
        notes: string | null
        awarded_at: string
        student: { first_name: string; last_name: string | null } | { first_name: string; last_name: string | null }[] | null
        coach: { full_name: string } | { full_name: string }[] | null
      }>>(),
    supabase
      .from('students')
      .select('star_tier'),
  ])

  // Weekly aggregates
  const weekTotalStars = (weekly ?? []).reduce((sum, r) => sum + (r.stars ?? 0), 0)
  const weekTotalAwards = (weekly ?? []).length
  // Top student this week
  const perStudent = (weekly ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.student_id] = (acc[r.student_id] ?? 0) + r.stars
    return acc
  }, {})
  let topStudent: { name: string; stars: number } | null = null
  const topId = Object.entries(perStudent).sort((a, b) => b[1] - a[1])[0]?.[0]
  if (topId) {
    const { data: stu } = await supabase
      .from('students')
      .select('first_name, last_name')
      .eq('id', topId)
      .maybeSingle()
    if (stu) topStudent = { name: `${stu.first_name}${stu.last_name ? ' ' + stu.last_name : ''}`, stars: perStudent[topId] }
  }

  // Tier counts
  const tierCounts = [0, 0, 0, 0, 0, 0]
  for (const s of tierGroups ?? []) {
    if (s.star_tier >= 1 && s.star_tier <= 5) tierCounts[s.star_tier]++
  }

  // Massage recent entries into DemoLedgerEntry shape (reusable view component)
  const entries: DemoLedgerEntry[] = (recent ?? []).map((r) => {
    const student = Array.isArray(r.student) ? r.student[0] : r.student
    const coach = Array.isArray(r.coach) ? r.coach[0] : r.coach
    return {
      id: r.id,
      date: r.awarded_at.slice(0, 10),
      student: student ? `${student.first_name}${student.last_name ? ' ' + student.last_name : ''}` : 'Unknown',
      stars: r.stars,
      reason: REASON_LABELS_SAFE.has(r.reason) ? r.reason : 'other',
      notes: r.notes,
      coach: coach?.full_name ?? '—',
    }
  })

  return (
    <DashboardShell
      user={user}
      currentPath="/stars"
      pageTitle="Star Ledger"
      pageSubtitle="Every star awarded — the BSC reward system that keeps kids coming back."
    >
      <StarLedgerView
        weekTotalStars={weekTotalStars}
        weekTotalAwards={weekTotalAwards}
        topStudent={topStudent}
        entries={entries}
        tierCounts={tierCounts}
        withActions
      />
    </DashboardShell>
  )
}
