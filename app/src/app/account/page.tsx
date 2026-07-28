import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { ChangePassword } from '@/components/change-password'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const user = await verifySession()
  return (
    <DashboardShell user={user} currentPath="/account" pageTitle="My Account" pageSubtitle="Update your login password">
      <ChangePassword email={user.email} />
    </DashboardShell>
  )
}
