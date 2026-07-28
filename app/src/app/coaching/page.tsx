import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { CoachingHub } from '@/components/coaching-hub'

export default async function CoachingPage() {
  const user = await verifySession()
  return (
    <DashboardShell user={user} currentPath="/coaching" pageTitle="Coach Academy" pageSubtitle="Training, pay progression and hiring — everything for building great coaches.">
      <CoachingHub />
    </DashboardShell>
  )
}
