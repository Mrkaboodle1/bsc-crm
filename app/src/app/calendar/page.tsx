import { StubPage } from '@/lib/stub-page'

export default async function CalendarPage() {
  return (
    <StubPage
      currentPath="/calendar"
      pageTitle="Calendar"
      pageSubtitle="Weekly grid of every class, party and workshop."
      icon="📅"
      slice="Slice 2 · Soon"
      title="The weekly view"
      description="Every recurring class, party booking, NDIS session and workshop on one Sun–Sat grid. Click a slot to see attendance and the assigned coach."
      bullets={[
        'Sun–Sat week view, Mon–Fri compressed for class-heavy weekdays',
        'Click any class → opens the Roll Call screen for that day',
        'Coach colour-coding — see at a glance who is on',
        'Party bookings + private lessons overlay alongside classes',
      ]}
    />
  )
}
