import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { getRoster } from '@/lib/roster'
import { RosterClient } from '@/components/roster-client'

export const dynamic = 'force-dynamic'

export default async function RosterPage() {
  const user = await verifySession()
  const { classes, workshops, kno, coaches } = await getRoster()
  const canManage = ['owner', 'manager'].includes(user.role)
  return (
    <DashboardShell user={user} currentPath="/roster" pageTitle="Staff Roster" pageSubtitle="Roster coaches & trainees across classes, holiday workshops & Kids Night Out — then email it to them in one click.">
      <RosterClient classes={classes} workshops={workshops} kno={kno} coaches={coaches} canManage={canManage} />
    </DashboardShell>
  )
}
