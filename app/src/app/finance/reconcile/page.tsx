import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { ReconcileClient, type ReconcileData, type CompareRow, type CheckState } from '@/components/reconcile-client'
import { ACCOUNTANT_TB } from '@/lib/accountant-trial-balance'
import { getProfitAndLoss, getBalanceSheet, pick, xeroConfigured, type FlatReport } from '@/lib/xero'

export const dynamic = 'force-dynamic'

// Australian financial year containing `date` → { from, to }.
function currentFY(today: Date) {
  const y = today.getFullYear()
  const julyThisYear = new Date(today.getFullYear(), 6, 1) // 1 July
  const startYear = today >= julyThisYear ? y : y - 1
  return { from: `${startYear}-07-01`, to: today.toISOString().slice(0, 10) }
}

const within = (a: number, b: number) => {
  const tol = Math.max(2, Math.abs(Math.max(a, b)) * 0.01) // $2 or 1%
  return Math.abs(a - b) <= tol
}

export default async function ReconcilePage() {
  const user = await verifySession()
  const ownerOrManager = user.role === 'owner' || user.role === 'manager'

  // Saved tick-offs / notes live in tenants.settings.reconcile (no extra table).
  let checks: Record<string, CheckState> = {}
  if (ownerOrManager) {
    const supabase = await createServerSupabase()
    const { data: t } = await supabase.from('tenants').select('settings').eq('id', user.tenantId).maybeSingle()
    const settings = (t?.settings ?? {}) as Record<string, unknown>
    checks = (settings.reconcile ?? {}) as Record<string, CheckState>
  }

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

  const live = !!pl && !!bs

  // ── Profit bridge ────────────────────────────────────────────────
  const xeroProfit = pl ? pick(pl, 'Net Profit') : null
  const expectedXeroProfit = ACCOUNTANT_TB.netProfit - ACCOUNTANT_TB.oneOffDirectorFee

  // ── Income (these map 1:1) ───────────────────────────────────────
  const income: CompareRow[] = ACCOUNTANT_TB.income.map((row) => {
    const xv = pl ? pick(pl, row.xero) : null
    return {
      name: row.name,
      accountant: row.amount,
      xero: xv,
      diff: xv == null ? null : Math.round((xv - row.amount) * 100) / 100,
      status: xv == null ? 'noxero' : within(xv, row.amount) ? 'match' : 'differ',
    }
  })

  // ── Key balances (map to Xero accounts; compared on magnitude) ───
  const balances: CompareRow[] = ACCOUNTANT_TB.balances.map((row) => {
    const raw = bs ? pick(bs, row.xero) : null
    const xv = raw == null ? null : Math.abs(raw)
    return {
      name: row.name,
      accountant: row.amount,
      xero: xv,
      diff: xv == null ? null : Math.round((xv - row.amount) * 100) / 100,
      status: xv == null ? 'noxero' : within(xv, row.amount) ? 'match' : 'differ',
      note: 'note' in row ? (row.note as string) : undefined,
    }
  })

  const totalIncomeAcc = ACCOUNTANT_TB.income.reduce((s, r) => s + r.amount, 0)
  const totalExpensesAcc = ACCOUNTANT_TB.expenses.reduce((s, r) => s + r.amount, 0)

  const data: ReconcileData = {
    live,
    configured,
    allowed: ownerOrManager,
    checks,
    xeroError,
    asAt: today.toISOString().slice(0, 10),
    fyLabel: `${fy.from} to ${fy.to}`,
    accountantLabel: ACCOUNTANT_TB.label,
    bridge: {
      accountantProfit: ACCOUNTANT_TB.netProfit,
      directorFee: ACCOUNTANT_TB.oneOffDirectorFee,
      expectedXeroProfit: Math.round(expectedXeroProfit * 100) / 100,
      xeroProfit,
      residual: xeroProfit == null ? null : Math.round((xeroProfit - expectedXeroProfit) * 100) / 100,
    },
    income,
    balances,
    totals: {
      incomeAccountant: Math.round(totalIncomeAcc * 100) / 100,
      incomeXero: pl ? pick(pl, 'Total Income') : null,
      expensesAccountant: Math.round(totalExpensesAcc * 100) / 100,
      expensesXero: pl ? pick(pl, 'Total Operating Expenses') : null,
    },
    expenses: ACCOUNTANT_TB.expenses.map((e) => ({ name: e.name, amount: e.amount })),
  }

  return (
    <DashboardShell
      user={user}
      currentPath="/finance/reconcile"
      pageTitle="🔍 Reconcile"
      pageSubtitle="Your live Xero numbers, lined up against your accountant — mismatches flagged automatically"
    >
      <div className="max-w-5xl">
        <ReconcileClient data={data} />
      </div>
    </DashboardShell>
  )
}
