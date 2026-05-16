import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { ImportForm } from './import-form'

export default async function FamiliesImportPage() {
  const user = await verifySession()
  return (
    <DashboardShell
      user={user}
      currentPath="/families"
      pageTitle="Import families"
      pageSubtitle="Drop your Tectonic CRM export (or any CSV). I'll auto-map common columns. Existing families update in place — no duplicates."
      pageActions={
        <a
          href="/families"
          className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
        >
          ← Families
        </a>
      }
    >
      <ImportForm />
    </DashboardShell>
  )
}
