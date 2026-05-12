import { DashboardShell } from '@/components/dashboard-shell'
import { StudentListView, type StudentRow } from '@/components/student-list-view'
import { demoUser, demoStudents } from '@/lib/demo-data'

export default async function DemoStudents({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tier?: string }>
}) {
  const { q, tier } = await searchParams

  let rows: StudentRow[] = demoStudents.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    age: s.age,
    familyId: s.familyId,
    familyName: s.familyName,
    lifecycle: s.lifecycle,
    totalStars: s.totalStars,
    starTier: s.starTier,
    traineeStatus: s.traineeStatus,
  }))

  if (q && q.trim()) {
    const term = q.trim().toLowerCase()
    rows = rows.filter(
      (r) =>
        r.firstName.toLowerCase().includes(term) ||
        (r.lastName ?? '').toLowerCase().includes(term)
    )
  }
  if (tier && /^[1-5]$/.test(tier)) {
    const t = parseInt(tier, 10)
    rows = rows.filter((r) => r.starTier === t)
  }

  return (
    <DashboardShell
      user={demoUser}
      currentPath="/students"
      pageTitle="Students"
      pageSubtitle={`${rows.length} sample students. (Demo mode)`}
    >
      <div className="mb-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-5 py-3 text-sm text-amber-900">
        <strong>Demo mode</strong> — sample student records. Tap a row to open the profile.
      </div>
      <StudentListView rows={rows} q={q ?? ''} tier={tier ?? ''} hrefPrefix="/demo/students" />
    </DashboardShell>
  )
}
