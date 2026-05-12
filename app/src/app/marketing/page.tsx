import { StubPage } from '@/lib/stub-page'

export default async function MarketingPage() {
  return (
    <StubPage
      currentPath="/marketing"
      pageTitle="Marketing"
      pageSubtitle="Plan, schedule and post to Instagram, Facebook and Threads."
      icon="📣"
      slice="Slice 5+ · Soon"
      title="Social planner"
      description="Replaces Tectonic Social Planner. Schedule posts across IG, FB and Threads from one calendar. Pulls performance back so you know what works."
      bullets={[
        'Already connected: Meta (Instagram + Facebook) MCP, Threads',
        'Drag-and-drop content calendar — week / month view',
        'Auto post-engagement pull (reach, likes, saves, comments)',
        'Auto-reply to DMs from posts with a trigger word',
        'Termly campaign templates: KNO, holiday programme, term enrolment',
      ]}
    />
  )
}
