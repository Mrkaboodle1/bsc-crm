import { DashboardShell } from '@/components/dashboard-shell'
import { StarLedgerView } from '@/components/star-ledger-view'
import { demoUser, demoLedger } from '@/lib/demo-data'

export default function DemoStars() {
  // Pre-computed mock aggregates
  const weekTotalStars = demoLedger.reduce((sum, e) => sum + e.stars, 0)
  const weekTotalAwards = demoLedger.length
  const perStudent = demoLedger.reduce<Record<string, number>>((acc, e) => {
    acc[e.student] = (acc[e.student] ?? 0) + e.stars
    return acc
  }, {})
  const topEntry = Object.entries(perStudent).sort((a, b) => b[1] - a[1])[0]
  const topStudent = topEntry ? { name: topEntry[0], stars: topEntry[1] } : null

  // Fake tier counts
  const tierCounts = [0, 12, 18, 14, 9, 3]

  return (
    <DashboardShell
      user={demoUser}
      currentPath="/stars"
      pageTitle="Star Ledger"
      pageSubtitle="The BSC reward system. (Demo mode)"
    >
      <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-5 py-3 text-sm text-amber-900">
        <strong>Demo mode</strong> — sample stars from real-looking students.
      </div>
      <StarLedgerView
        weekTotalStars={weekTotalStars}
        weekTotalAwards={weekTotalAwards}
        topStudent={topStudent}
        entries={demoLedger}
        tierCounts={tierCounts}
      />
    </DashboardShell>
  )
}
