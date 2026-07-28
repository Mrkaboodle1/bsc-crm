import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { RewardMilestonesClient, type DueRow } from '@/components/reward-milestones-client'

export const dynamic = 'force-dynamic'

type Fam = { primary_parent: string | null; family_name: string | null }
type Stu = { first_name: string; last_name: string | null; family: Fam | Fam[] | null }

export default async function RewardMilestonesPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const { data, error } = await supabase.from('reward_milestones')
    .select('id, milestone, year, reached_at, status, student:students(first_name, last_name, family:families(primary_parent, family_name))')
    .eq('tenant_id', user.tenantId).eq('status', 'reached').order('reached_at', { ascending: false })

  const missing = !!error && (error.message.includes('does not exist') || error.message.includes('relation'))

  const rows: DueRow[] = (data ?? []).map((r) => {
    const stu = (Array.isArray(r.student) ? r.student[0] : r.student) as Stu | null
    const fam = stu ? (Array.isArray(stu.family) ? stu.family[0] : stu.family) : null
    const child = stu ? `${stu.first_name} ${stu.last_name ?? ''}`.trim() : 'A child'
    return { id: r.id, milestone: r.milestone, year: r.year, reachedAt: r.reached_at, child, parent: fam?.primary_parent ?? fam?.family_name ?? null }
  })

  return (
    <DashboardShell
      user={user}
      currentPath="/rewards/milestones"
      pageTitle="🎁 Reward Milestones"
      pageSubtitle="Kids who've earned a loyalty reward from their attendance — hand it out and tick it off"
    >
      <div className="max-w-4xl">
        {missing ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
            This needs its database table set up first. Paste migration <strong>038_reward_milestones.sql</strong> into Supabase, then refresh.
          </div>
        ) : (
          <RewardMilestonesClient initial={rows} />
        )}
      </div>
    </DashboardShell>
  )
}
