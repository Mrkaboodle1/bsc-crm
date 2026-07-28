import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { getWorkshops, getRosterCoaches } from '@/lib/workshops'
import { WorkshopsAdmin } from '@/components/workshops-admin'

export const dynamic = 'force-dynamic'

export default async function WorkshopsPage() {
  const user = await verifySession()
  const ws = await getWorkshops()
  const coaches = await getRosterCoaches()
  const canManage = ['owner', 'manager'].includes(user.role)
  return (
    <DashboardShell user={user} currentPath="/workshops" pageTitle="Holiday Workshops" pageSubtitle="School-holiday program — capacity, member priority & waitlist.">
      {ws === null ? (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-8 max-w-2xl">
          <div className="text-3xl mb-2">🛠️</div>
          <h2 className="font-extrabold text-zinc-900 text-lg mb-2">One-time setup needed</h2>
          <p className="text-sm text-zinc-700">Paste <code className="bg-white px-1.5 py-0.5 rounded text-xs">schema/021_holiday_workshops.sql</code> into Supabase once, then refresh.</p>
        </div>
      ) : (
        <WorkshopsAdmin workshops={ws} coaches={coaches} canManage={canManage} />
      )}
    </DashboardShell>
  )
}
