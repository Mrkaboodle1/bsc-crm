import { notFound } from 'next/navigation'
import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { getCoachDay } from '@/lib/coach-portal'
import { getRunningOrder, getWorkshopActivities, getOrderTemplates } from '@/lib/workshop-activities'
import { WorkshopDayBoard } from '@/components/workshop-day-board'
import { RunningOrderEditor } from '@/components/running-order-editor'

export const dynamic = 'force-dynamic'

const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

export default async function CoachPortalDayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await verifySession()
  const data = await getCoachDay(id)
  if (!data) notFound()
  const { day, students, staff } = data
  const [runningOrder, activities, orderTemplates] = await Promise.all([getRunningOrder(id), getWorkshopActivities(), getOrderTemplates()])

  return (
    <DashboardShell
      user={user}
      currentPath="/coach-portal"
      pageTitle={`${day.isKno ? '🌙' : '🎪'} ${fmt(day.date)}`}
      pageSubtitle={`${day.start_time?.slice(0, 5)}–${day.end_time?.slice(0, 5)} · ${day.title}`}
      pageActions={<Link href="/coach-portal" className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50">← All days</Link>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-6xl">
        {/* Attendance board — main column */}
        <div className="lg:col-span-2">
          <WorkshopDayBoard workshopId={day.id} initial={students} />
        </div>

        {/* Side: running order + activity + staff */}
        <aside className="space-y-4">
          <Link href="/incidents" className="flex items-center justify-center gap-2 bg-red-600 text-white font-bold text-sm px-4 py-3 rounded-xl hover:bg-red-700">🚑 Log an incident / accident</Link>
          {staff.length > 0 && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-4">
              <div className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-500 mb-2">👥 Coaches today</div>
              <div className="flex flex-wrap gap-1.5">
                {staff.map((s, i) => <span key={i} className="text-xs font-bold bg-zinc-100 px-2 py-1 rounded-lg">{s.coach_name} <span className="text-zinc-400 uppercase text-[9px]">{s.role}</span></span>)}
              </div>
            </div>
          )}
          {day.activity && (
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
              <div className="text-[10px] font-extrabold uppercase tracking-wide text-violet-700 mb-1">🎨 Today's craft / activity</div>
              <p className="text-sm text-violet-900">{day.activity}</p>
            </div>
          )}
          <RunningOrderEditor workshopId={day.id} initial={runningOrder} activities={activities ?? []} templates={orderTemplates} />
          <a href="/coach-portal/activities" className="block text-center text-xs font-bold text-[#D72027] bg-red-50 rounded-2xl py-2.5 hover:bg-red-100">🎨 Open the activity library →</a>
        </aside>
      </div>
    </DashboardShell>
  )
}
