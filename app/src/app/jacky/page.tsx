import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { JackyChat } from './jacky-chat'

export default async function JackyPage() {
  const user = await verifySession()

  return (
    <DashboardShell
      user={user}
      currentPath="/jacky"
      pageTitle="Ask Jacky 🎪"
      pageSubtitle="Your AI with hands. Tell her what to do — she reads, drafts, queues. You approve in /inbox."
    >
      <JackyChat userName={user.fullName?.split(' ')[0] ?? null} />
    </DashboardShell>
  )
}
