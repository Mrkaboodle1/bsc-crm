// Helper to render a "coming soon" stub for routes whose Slice hasn't shipped.
// Keeps the sidebar navigable while we build incrementally.

import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { ComingSoon } from '@/components/coming-soon'

export async function StubPage(props: {
  currentPath: string
  pageTitle: string
  pageSubtitle?: string
  icon?: string
  slice: string
  title: string
  description: string
  bullets?: string[]
}) {
  const user = await verifySession()
  return (
    <DashboardShell
      user={user}
      currentPath={props.currentPath}
      pageTitle={props.pageTitle}
      pageSubtitle={props.pageSubtitle}
    >
      <ComingSoon
        icon={props.icon}
        slice={props.slice}
        title={props.title}
        description={props.description}
        bullets={props.bullets}
      />
    </DashboardShell>
  )
}
