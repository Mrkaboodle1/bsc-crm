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
      pageTitle="Ask Jacky"
      pageSubtitle="Your AI assistant. Ask her to read your inbox, draft replies, find contacts — she queues every send to /inbox for your approval."
    >
      <JackyChat userName={user.fullName?.split(' ')[0] ?? null} initialPrompt={prefill ?? null} />
    </DashboardShell>
  )
}
