import { notFound } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { AttendanceGrid } from '@/app/roll-call/[classId]/attendance-grid'
import { demoUser, demoTodayClasses, demoRosters } from '@/lib/demo-data'
import { DemoActionsBootstrap } from './demo-actions-bootstrap'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h, 10)
  const period = hour >= 12 ? 'pm' : 'am'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}:${m}${period}`
}

export default async function DemoAttendance({
  params,
}: {
  params: Promise<{ classId: string }>
}) {
  const { classId } = await params
  const cls = demoTodayClasses.find((c) => c.id === classId)
  if (!cls) notFound()

  const roster = demoRosters[classId] ?? []

  return (
    <DashboardShell
      user={demoUser}
      currentPath="/roll-call"
      pageTitle={cls.name}
      pageSubtitle={`Wednesday · ${formatTime(cls.start_time)} · ${cls.duration_minutes} min · Coach ${cls.coach}`}
      pageActions={
        <a
          href="/demo/roll-call"
          className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
        >
          ← All classes
        </a>
      }
    >
      <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-5 py-3 text-sm text-amber-900 mb-6">
        <strong>Demo mode</strong> — taps update the UI but don&apos;t save. <a href="/login" className="underline font-extrabold ml-1">Sign in</a> to make it real.
      </div>
      <DemoActionsBootstrap classId={cls.id} date="2026-05-13" roster={roster} />
    </DashboardShell>
  )
}
