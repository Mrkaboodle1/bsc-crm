import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { getWorkshopActivities } from '@/lib/workshop-activities'
import { ActivityLibrary } from '@/components/activity-library'

export const dynamic = 'force-dynamic'

export default async function WorkshopActivitiesPage() {
  const user = await verifySession()
  const activities = await getWorkshopActivities()

  return (
    <DashboardShell
      user={user}
      currentPath="/coach-portal/activities"
      pageTitle="🎨 Workshop Activities"
      pageSubtitle="The craft & circus activity library — photos, demo videos, fully editable"
      pageActions={<a href="/coach-portal" className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50">← Coach Events</a>}
    >
      <div className="max-w-6xl">
        {activities === null ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
            The activity library needs its database table set up first. Paste migration <strong>035_workshop_activities.sql</strong> into Supabase, then refresh this page.
          </div>
        ) : (
          <ActivityLibrary initial={activities} />
        )}
      </div>
    </DashboardShell>
  )
}
