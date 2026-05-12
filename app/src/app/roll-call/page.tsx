import { StubPage } from '@/lib/stub-page'

export default async function RollCallPage() {
  return (
    <StubPage
      currentPath="/roll-call"
      pageTitle="Roll Call"
      pageSubtitle="Take attendance on your iPad during class."
      icon="📋"
      slice="Slice 2 · Next"
      title="The killer feature — coming next"
      description="Open the class, see big tap-tiles for every enrolled student. Tap to cycle status (here / late / absent). Long-press to award a star. Auto-saves on every tap."
      bullets={[
        'Day picker — slide between Mon → Sat to find today\'s classes',
        'Tap-tile per student — green/amber/red for attendance status',
        'Long-press tile → modal: award 1–3 stars with a note',
        'Coach-only access — students never see the screen',
        'Offline-tolerant — keeps a local queue, syncs when Wi-Fi is back',
      ]}
    />
  )
}
