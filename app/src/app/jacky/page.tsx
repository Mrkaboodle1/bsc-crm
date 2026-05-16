import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { JackyChat } from './jacky-chat'

export default async function JackyPage({
  searchParams,
}: {
  searchParams: Promise<{ prefill?: string }>
}) {
  const user = await verifySession()
  const { prefill } = await searchParams

  return (
    <DashboardShell
      user={user}
      currentPath="/jacky"
      pageTitle="Ask Jacky 🎪"
      pageSubtitle="Your AI with hands. Tell her what to do — she reads, drafts, queues. You approve in /inbox."
    >
      <JackyChat userName={user.fullName?.split(' ')[0] ?? null} initialPrompt={prefill ?? null} />
    </DashboardShell>
  )
}
