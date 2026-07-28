import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { getProfitAndLoss, getBalanceSheet, pick, xeroConfigured, type FlatReport } from '@/lib/xero'

export const dynamic = 'force-dynamic'

const money = (n: number | null) =>
  n == null ? '—' : (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

function currentFY(today: Date) {
  const y = today.getFullYear()
  const julyThisYear = new Date(today.getFullYear(), 6, 1)
  const startYear = today >= julyThisYear ? y : y - 1
  return { from: `${startYear}-07-01`, to: today.toISOString().slice(0, 10), startYear }
}

export default async function SnapshotPage() {
  const user = await verifySession()
  const ownerOrManager = user.role === 'owner' || user.role === 'manager'
  const today = new Date()
  const fy = currentFY(today)

  let pl: FlatReport | null = null
  let bs: FlatReport | null = null
  let xeroError: string | null = null
  const configured = xeroConfigured()
  if (configured && ownerOrManager) {
    try {
      ;[pl, bs] = await Promise.all([getProfitAndLoss(fy.from, fy.to), getBalanceSheet(fy.to)])
    } catch (e) {
      xeroError = e instanceof Error ? e.message : 'Could not reach Xero.'
    }
  }

  const income = pl ? pick(pl, 'Total Income') : null
  const expenses = pl ? pick(pl, 'Total Operating Expenses') : null
  const profit = pl ? pick(pl, 'Net Profit') : null
  const cash = bs ? pick(bs, 'Total Bank') : null
  const owedToYou = bs ? pick(bs, 'Accounts Receivable') : null
  const gst = bs ? pick(bs, 'GST') : null
  const youOwe = bs
    ? Math.max(0, pick(bs, 'PAYG Withholdings Payable')) +
      Math.max(0, pick(bs, 'Superannuation Payable')) +
      Math.max(0, pick(bs, 'Accounts Payable')) +
      Math.max(0, pick(bs, 'Wages Payable - Payroll')) +
      Math.max(0, gst ?? 0)
    : null

  const fyLabel = `1 Jul ${fy.startYear} – today`

  const Card = ({ label, value, tone, sub }: { label: string; value: string; tone?: string; sub?: string }) => (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`text-2xl font-bold tabular-nums mt-1 ${tone || 'text-zinc-900'}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-400 mt-1">{sub}</div>}
    </div>
  )

  return (
    <DashboardShell
      user={user}
      currentPath="/finance/snapshot"
      pageTitle="📈 Money Snapshot"
      pageSubtitle="Your whole financial picture in one glance — live from Xero"
    >
      <div className="max-w-4xl space-y-5">
        {!ownerOrManager && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
            The Money Snapshot is for the business owner only.
          </div>
        )}

        {ownerOrManager && (
          <>
            {!configured && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
                Xero isn&apos;t connected yet, so the numbers are blank. Once linked, this fills in on its own.
              </div>
            )}
            {configured && xeroError && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
                Couldn&apos;t reach Xero just now — please refresh in a moment.
              </div>
            )}

            {/* Profit hero */}
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 text-white rounded-2xl p-6">
              <div className="text-sm text-emerald-100">Profit this financial year ({fyLabel})</div>
              <div className="text-4xl font-bold tabular-nums mt-1">{money(profit)}</div>
              <div className="text-xs text-emerald-100 mt-2">
                {money(income)} came in, {money(expenses)} went out.
              </div>
            </div>

            {/* Cash position */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card label="💵 Cash in the bank" value={money(cash)} tone={cash != null && cash < 2000 ? 'text-rose-600' : 'text-zinc-900'} sub="Across all accounts right now" />
              <Card label="📥 Owed to you" value={money(owedToYou)} tone="text-sky-600" sub="Unpaid customer invoices" />
              <Card label="📤 You owe (tax/super/bills)" value={money(youOwe)} tone="text-rose-600" sub="Building toward BAS & pay dates" />
            </div>

            {/* Money in / out */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card label="Money in (year so far)" value={money(income)} tone="text-emerald-700" />
              <Card label="Money out (year so far)" value={money(expenses)} tone="text-zinc-700" />
            </div>

            {/* Plain-English read */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 text-sm text-zinc-700">
              <p className="font-semibold text-zinc-900 mb-1">In plain English</p>
              {cash != null && youOwe != null && cash < youOwe ? (
                <p>
                  You&apos;ve got <strong>{money(cash)}</strong> in the bank but around <strong>{money(youOwe)}</strong> in tax,
                  super and bills building up. Chasing the <strong>{money(owedToYou)}</strong> owed to you would help close that
                  gap — see <em>Who Owes You</em>.
                </p>
              ) : (
                <p>Your cash position is keeping ahead of what you owe — nicely done. Keep an eye on the <em>Money Due</em> dates.</p>
              )}
            </div>

            <p className="text-xs text-zinc-400">Live from Xero. Figures update every time you open this page.</p>
          </>
        )}
      </div>
    </DashboardShell>
  )
}
