import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { getKidsNightOut, getRosterCoaches } from '@/lib/workshops'
import { WorkshopsAdmin } from '@/components/workshops-admin'

export const dynamic = 'force-dynamic'

export default async function KidsNightOutPage() {
  const user = await verifySession()
  const events = await getKidsNightOut()
  const coaches = await getRosterCoaches()
  const canManage = ['owner', 'manager'].includes(user.role)

  return (
    <DashboardShell user={user} currentPath="/kids-night-out" pageTitle="Kids Night Out" pageSubtitle="Headcount, pizza numbers & who's paid — each disco night.">
      {events === null ? (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-8 max-w-2xl">
          <div className="text-3xl mb-2">🛠️</div>
          <h2 className="font-extrabold text-zinc-900 text-lg mb-2">One-time setup needed</h2>
          <p className="text-sm text-zinc-700">Kids Night Out shares the holiday-workshop storage. Paste <code className="bg-white px-1.5 py-0.5 rounded text-xs">schema/021_holiday_workshops.sql</code> into Supabase once, then refresh.</p>
        </div>
      ) : (
        <WorkshopsAdmin workshops={events} coaches={coaches} canManage={canManage} />
      )}
    </DashboardShell>
  )
}
