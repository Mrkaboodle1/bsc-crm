import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const money = (n: number | null) =>
  n == null ? '—' : (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default async function MoneyDashboardPage() {
  const user = await verifySession()
  const ownerOrManager = user.role === 'owner' || user.role === 'manager'
  const admin = createAdminSupabase()
  const tid = user.tenantId

  let needsReview = 0, cash: number | null = null, inMonth = 0, outMonth = 0
  let unpaidCount = 0, unpaidTotal = 0
  if (ownerOrManager) {
    const month = new Date().toISOString().slice(0, 7)
    const { data: bt } = await admin.from('bank_transactions').select('amount, direction, status, txn_date, balance').eq('tenant_id', tid)
    if (bt) {
      let latestDate = ''
      for (const t of bt) {
        if (t.status === 'needs_review') needsReview++
        if ((t.txn_date || '').slice(0, 7) === month) { if (t.direction === 'in') inMonth += Number(t.amount); else outMonth += Number(t.amount) }
        if (t.balance != null && t.txn_date > latestDate) { latestDate = t.txn_date; cash = Number(t.balance) }
      }
    }
    const { data: inv } = await admin.from('bs_invoices').select('total, status').eq('tenant_id', tid).in('status', ['awaiting', 'sent'])
    if (inv) { unpaidCount = inv.length; unpaidTotal = inv.reduce((s, i) => s + Number(i.total), 0) }
  }

  const Tile = ({ label, value, tone, href, cta }: { label: string; value: string; tone?: string; href: string; cta: string }) => (
    <Link href={href} className="block bg-white border border-zinc-200 rounded-2xl p-5 hover:border-[#D72027] hover:shadow-sm transition-all">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`text-2xl font-bold tabular-nums mt-1 ${tone || 'text-zinc-900'}`}>{value}</div>
      <div className="text-xs text-[#D72027] font-bold mt-2">{cta} →</div>
    </Link>
  )

  return (
    <DashboardShell user={user} currentPath="/finance/dashboard" pageTitle="🎯 Money Action Centre" pageSubtitle="What needs doing — at a glance">
      <div className="max-w-4xl space-y-5">
        {!ownerOrManager ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">This is for the business owner only.</div>
        ) : (
          <>
            {/* The to-do tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Tile label="🔴 Transactions to review" value={String(needsReview)} tone={needsReview ? 'text-amber-600' : 'text-emerald-600'} href="/finance/bank" cta={needsReview ? 'Reconcile them' : 'All caught up'} />
              <Tile label="📥 Money owed to you" value={money(unpaidTotal)} tone="text-sky-600" href="/finance/owed" cta={`Chase ${unpaidCount} invoice${unpaidCount === 1 ? '' : 's'}`} />
              <Tile label="💵 Cash in the bank" value={money(cash)} tone={cash != null && cash < 2000 ? 'text-rose-600' : 'text-zinc-900'} href="/finance/snapshot" cta="See full picture" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Tile label="📈 In this month" value={money(inMonth)} tone="text-emerald-700" href="/finance/bank" cta="View" />
              <Tile label="📉 Out this month" value={money(outMonth)} tone="text-rose-600" href="/finance/bank" cta="View" />
              <Tile label="📅 Tax & super due" value="See dates" href="/finance/cash-calendar" cta="What's coming" />
            </div>

            {/* Quick actions */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5">
              <div className="text-sm font-bold text-zinc-900 mb-3">Quick actions</div>
              <div className="flex flex-wrap gap-2">
                <Link href="/finance/bank" className="text-sm font-bold px-4 py-2 rounded-xl bg-[#D72027] hover:bg-[#A0151B] text-white">Import bank file</Link>
                <Link href="/finance/invoices" className="text-sm font-bold px-4 py-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-800">New invoice</Link>
                <Link href="/finance/reconcile" className="text-sm font-bold px-4 py-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-800">Reconcile vs accountant</Link>
                <Link href="/finance/snapshot" className="text-sm font-bold px-4 py-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-800">Money snapshot</Link>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  )
}
