import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { getCoachDays } from '@/lib/coach-portal'
import { CoachDaysList } from '@/components/coach-days-list'

export const dynamic = 'force-dynamic'

export default async function CoachPortalPage() {
  const user = await verifySession()
  const days = await getCoachDays()
  const canManage = ['owner', 'manager'].includes(user.role)

  return (
    <DashboardShell user={user} currentPath="/coach-portal" pageTitle="Coach Events" pageSubtitle="Your School Holiday Workshops & Kids Night Out — tap a day to run it (sign-in/out, attendance, running order).">
      {days === null ? (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-8 max-w-2xl">
          <div className="text-3xl mb-2">🛠️</div>
          <h2 className="font-extrabold text-zinc-900 text-lg mb-2">One-time setup needed</h2>
          <p className="text-sm text-zinc-700">Paste <code className="bg-white px-1.5 py-0.5 rounded text-xs">schema/030_workshop_attendance.sql</code> into Supabase once, then refresh.</p>
        </div>
      ) : (
        <CoachDaysList days={days} canManage={canManage} />
      )}
    </DashboardShell>
  )
}
