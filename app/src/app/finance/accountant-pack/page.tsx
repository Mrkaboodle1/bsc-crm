import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { buildPack, packCsv, monthLabel } from '@/lib/accountant-pack'
import { AccountantPackActions } from '@/components/accountant-pack-actions'

export const dynamic = 'force-dynamic'

const money = (n: number) => (n < 0 ? '-' : '') + '$' + Math.abs(Number(n) || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function lastMonths(n: number) {
  const out: { value: string; label: string }[] = []
  const d = new Date()
  for (let i = 0; i < n; i++) { const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; out.push({ value: ym, label: monthLabel(ym) }); d.setMonth(d.getMonth() - 1) }
  return out
}

export default async function AccountantPackPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await verifySession()
  const ownerOrManager = user.role === 'owner' || user.role === 'manager'
  const sp = await searchParams
  const now = new Date()
  const month = /^\d{4}-\d{2}$/.test(sp.month || '') ? sp.month! : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  if (!ownerOrManager) {
    return (
      <DashboardShell user={user} currentPath="/finance/accountant-pack" pageTitle="📦 Accountant Pack">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">This is for the business owner only.</div>
      </DashboardShell>
    )
  }

  const admin = createAdminSupabase()
  const pack = await buildPack(admin, user.tenantId, month)
  const csv = packCsv(pack)
  const { data: t } = await admin.from('tenants').select('settings, name, abn').eq('id', user.tenantId).maybeSingle()
  const accountantEmail = ((t?.settings as { accountantEmail?: string })?.accountantEmail) || ''
  const bizName = t?.name || 'Big Star Circus'
  const abn = t?.abn || ''

  const Row = ({ label, amount, muted }: { label: string; amount: number; muted?: boolean }) => (
    <div className="flex justify-between py-1.5 border-b border-zinc-50 text-sm"><span className={muted ? 'text-zinc-500' : 'text-zinc-700'}>{label}</span><span className="tabular-nums text-zinc-800">{money(amount)}</span></div>
  )

  return (
    <DashboardShell user={user} currentPath="/finance/accountant-pack" pageTitle="📦 Accountant Pack" pageSubtitle="A clean monthly summary to hand your accountant — income, expenses, GST & payroll in one place">
      <style>{`@media print { aside, header, .no-print { display:none !important; } body { background:#fff !important; } .print-card { box-shadow:none !important; border:1px solid #ccc !important; } }`}</style>
      <div className="max-w-3xl space-y-4">
        <AccountantPackActions month={month} months={lastMonths(12)} csv={csv} defaultEmail={accountantEmail} />

        {pack.needsReview > 0 && (
          <div className="no-print bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900">
            🔎 <strong>{pack.needsReview}</strong> transaction{pack.needsReview === 1 ? '' : 's'} this month still need a category and are <em>not</em> in these totals. Tidy them on <a href="/finance/bank" className="underline font-bold">Bank &amp; Reconcile</a> for a fully accurate pack.
          </div>
        )}

        {/* Cover */}
        <div className="print-card bg-white border border-zinc-200 rounded-2xl p-6">
          <div className="flex justify-between flex-wrap gap-2 border-b-2 border-zinc-200 pb-3">
            <div><div className="text-lg font-bold text-zinc-900">{bizName}</div>{abn && <div className="text-xs text-zinc-500">ABN {abn}</div>}</div>
            <div className="text-right"><div className="text-lg font-bold text-zinc-900">{pack.monthLabel}</div><div className="text-xs text-zinc-500">Accountant Pack</div></div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div><div className="text-xs text-zinc-500">Total income</div><div className="text-xl font-bold tabular-nums text-emerald-600">{money(pack.incomeTotal)}</div></div>
            <div><div className="text-xs text-zinc-500">Total expenses</div><div className="text-xl font-bold tabular-nums text-rose-600">{money(pack.expenseTotal)}</div></div>
            <div><div className="text-xs text-zinc-500">Net profit</div><div className={`text-xl font-bold tabular-nums ${pack.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{money(pack.net)}</div></div>
          </div>
        </div>

        {/* Income */}
        <div className="print-card bg-white border border-zinc-200 rounded-2xl p-6">
          <h2 className="font-bold text-zinc-900 mb-2">Income</h2>
          {pack.income.length ? pack.income.map((e) => <Row key={e.label} label={e.label} amount={e.amount} />) : <p className="text-sm text-zinc-400">No income reconciled this month.</p>}
          <div className="flex justify-between pt-2 mt-1 border-t-2 border-zinc-200 font-bold text-sm"><span>Total income</span><span className="tabular-nums">{money(pack.incomeTotal)}</span></div>
        </div>

        {/* Expenses */}
        <div className="print-card bg-white border border-zinc-200 rounded-2xl p-6">
          <h2 className="font-bold text-zinc-900 mb-2">Expenses</h2>
          {pack.expenses.length ? pack.expenses.map((e) => <Row key={e.label} label={e.label} amount={e.amount} />) : <p className="text-sm text-zinc-400">No expenses reconciled this month.</p>}
          <div className="flex justify-between pt-2 mt-1 border-t-2 border-zinc-200 font-bold text-sm"><span>Total expenses</span><span className="tabular-nums">{money(pack.expenseTotal)}</span></div>
        </div>

        {/* GST */}
        <div className="print-card bg-white border border-zinc-200 rounded-2xl p-6">
          <h2 className="font-bold text-zinc-900 mb-2">GST position <span className="text-xs font-normal text-zinc-400">(estimate — accountant confirms on the BAS)</span></h2>
          <Row label="GST collected on income" amount={pack.gst.collected} />
          <Row label="GST credits on expenses" amount={pack.gst.credits} muted />
          <div className="flex justify-between pt-2 mt-1 border-t-2 border-zinc-200 font-bold text-sm"><span>Net GST {pack.gst.net >= 0 ? 'owed to ATO' : 'refund'}</span><span className="tabular-nums">{money(Math.abs(pack.gst.net))}</span></div>
        </div>

        {/* Payroll */}
        {pack.payroll && (
          <div className="print-card bg-white border border-zinc-200 rounded-2xl p-6">
            <h2 className="font-bold text-zinc-900 mb-2">Payroll <span className="text-xs font-normal text-zinc-400">({pack.payroll.runs} pay run{pack.payroll.runs === 1 ? '' : 's'})</span></h2>
            <Row label="Gross wages" amount={pack.payroll.gross} />
            <Row label="Superannuation → to super funds" amount={pack.payroll.super} muted />
          </div>
        )}

        {/* Footnotes */}
        <div className="print-card bg-zinc-50 border border-zinc-200 rounded-2xl p-5 text-xs text-zinc-500 space-y-1">
          {pack.unpaid.count > 0 && <div>📥 {pack.unpaid.count} invoices still unpaid, totalling {money(pack.unpaid.total)} (not in the income above until paid/reconciled).</div>}
          {pack.personalTotal > 0 && <div>Excluded for transparency: {money(pack.personalTotal)} of personal / director-loan transactions are kept out of these figures.</div>}
          <div>Compiled from {pack.txnCount} bank transactions for {pack.monthLabel}. GST is an estimate — please confirm against source records.</div>
        </div>
      </div>
    </DashboardShell>
  )
}
