import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { getMembershipPlans } from '@/lib/pos'
import { MembershipsManager } from '@/components/memberships-manager'

export const dynamic = 'force-dynamic'

export default async function MembershipsPage() {
  const user = await verifySession()
  const plans = await getMembershipPlans()
  const canManage = ['owner', 'manager'].includes(user.role)

  return (
    <DashboardShell user={user} currentPath="/memberships" pageTitle="Memberships" pageSubtitle="The plans and passes you offer families.">
      {plans === null ? (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-8 max-w-2xl">
          <div className="text-3xl mb-2">🛠️</div>
          <h2 className="font-extrabold text-zinc-900 text-lg mb-2">One-time setup needed</h2>
          <p className="text-sm text-zinc-700">Memberships share the same setup file as the till (<code className="bg-white px-1.5 py-0.5 rounded text-xs">schema/016_pos_memberships.sql</code>). Paste it into Supabase once, then refresh.</p>
        </div>
      ) : (
        <MembershipsManager plans={plans} canManage={canManage} />
      )}
    </DashboardShell>
  )
}
