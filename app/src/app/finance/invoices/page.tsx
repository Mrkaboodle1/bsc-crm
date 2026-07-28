import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { InvoicesClient } from '@/components/invoices-client'

export const dynamic = 'force-dynamic'

export default async function InvoicesPage() {
  const user = await verifySession()
  const ownerOrManager = user.role === 'owner' || user.role === 'manager'

  return (
    <DashboardShell
      user={user}
      currentPath="/finance/invoices"
      pageTitle="🧾 Invoices"
      pageSubtitle="Make and send invoices — emailed straight to your customer as a PDF"
    >
      <div className="max-w-6xl">
        {ownerOrManager ? (
          <InvoicesClient />
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">Invoices are for the business owner only.</div>
        )}
      </div>
    </DashboardShell>
  )
}
