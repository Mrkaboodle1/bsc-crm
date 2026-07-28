import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { BankClient } from '@/components/bank-client'

export const dynamic = 'force-dynamic'

export default async function BankPage() {
  const user = await verifySession()
  const ownerOrManager = user.role === 'owner' || user.role === 'manager'
  return (
    <DashboardShell user={user} currentPath="/finance/bank" pageTitle="🏦 Bank & Reconcile" pageSubtitle="Import your CommBank file, then approve each transaction's category">
      <div className="max-w-4xl">
        {ownerOrManager ? <BankClient /> : <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">This is for the business owner only.</div>}
      </div>
    </DashboardShell>
  )
}
