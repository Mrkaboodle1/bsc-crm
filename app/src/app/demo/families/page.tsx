import { DashboardShell } from '@/components/dashboard-shell'
import { FamilyListView, type FamilyRow } from '@/components/family-list-view'
import { demoUser, demoFamilies } from '@/lib/demo-data'

export default async function DemoFamilies({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string }>
}) {
  const { q, stage } = await searchParams

  let rows: FamilyRow[] = demoFamilies.map((f) => ({
    id: f.id,
    name: f.name,
    primaryParent: f.primaryParent,
    email: f.email,
    phone: f.phone,
    lifecycle: f.lifecycle,
    source: f.source,
    weeklyFee: f.weeklyFee,
    studentCount: f.studentCount,
    tags: f.tags,
  }))

  if (q && q.trim()) {
    const term = q.trim().toLowerCase()
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        (r.primaryParent ?? '').toLowerCase().includes(term) ||
        (r.email ?? '').toLowerCase().includes(term)
    )
  }
  if (stage && stage.trim()) {
    rows = rows.filter((r) => r.lifecycle === stage)
  }

  return (
    <DashboardShell
      user={demoUser}
      currentPath="/families"
      pageTitle="Families"
      pageSubtitle={`${rows.length} sample families. (Demo mode)`}
    >
      <div className="mb-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-5 py-3 text-sm text-amber-900">
        <strong>Demo mode</strong> — sample household records.
      </div>
      <FamilyListView rows={rows} q={q ?? ''} stage={stage ?? ''} hrefPrefix="/demo/families" />
    </DashboardShell>
  )
}
