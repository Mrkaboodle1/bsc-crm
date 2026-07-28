import 'server-only'
import { createAdminSupabase } from './supabase-admin'
import { xeroConfigured, getProfitAndLoss, getBalanceSheet, pick, pickPrior, type FlatReport } from './xero'

// The whole company in one object: the Xero financial position (snapshot),
// the LIVE Stripe subscription book, and what the CRM knows about students.
// Everything Big Star Books shows on the Position page comes from here.

const TENANT = process.env.BSC_TENANT_ID || '33c7b22a-52c6-444e-9057-d03d5ed3d94e'

export type XeroSnapshot = {
  as_at: string; source: string; fy: string
  pnl: { income_total: number; income: { name: string; amount: number }[]; expenses_total: number; expenses: { name: string; amount: number }[]; net_profit: number }
  balance_sheet: Record<string, number>
  owed_now: { label: string; payg: number; super: number; wages: number; total: number }
}

export type StripeBook = {
  active: number; pastDue: number; cancelled: number
  weeklyRecurring: number; annualisedRevenue: number
  failing: { name: string; email: string | null; amount: number; since: string | null }[]
}

export type CompanyPosition = {
  xero: XeroSnapshot | null
  stripe: StripeBook
  students: { active: number; families: number; payingFamilies: number; notPaying: number }
  alerts: { level: 'critical' | 'warn' | 'info'; title: string; detail: string; amount?: number }[]
}

async function liveStripeBook(): Promise<StripeBook> {
  const empty: StripeBook = { active: 0, pastDue: 0, cancelled: 0, weeklyRecurring: 0, annualisedRevenue: 0, failing: [] }
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return empty
  const admin = createAdminSupabase()
  const { data: subs } = await admin
    .from('subscriptions')
    .select('status, weekly_amount, current_period_end, family:families!subscriptions_family_id_fkey(family_name, primary_parent, email)')
    .eq('tenant_id', TENANT)
  const book = { ...empty, failing: [] as StripeBook['failing'] }
  for (const s of subs ?? []) {
    const fam = Array.isArray(s.family) ? s.family[0] : s.family
    if (s.status === 'active') { book.active++; book.weeklyRecurring += Number(s.weekly_amount || 0) }
    else if (s.status === 'past_due') {
      book.pastDue++
      book.failing.push({ name: fam?.primary_parent || fam?.family_name || 'Unknown', email: fam?.email ?? null, amount: Number(s.weekly_amount || 0), since: s.current_period_end ?? null })
    } else if (s.status === 'cancelled') book.cancelled++
  }
  book.weeklyRecurring = +book.weeklyRecurring.toFixed(2)
  book.annualisedRevenue = +(book.weeklyRecurring * 52).toFixed(2)
  book.failing.sort((a, b) => b.amount - a.amount)
  return book
}

/** The current Australian financial year (1 Jul – 30 Jun). */
function currentFY(): { from: string; to: string; label: string } {
  const now = new Date()
  const y = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
  return { from: `${y}-07-01`, to: `${y + 1}-06-30`, label: `FY${String(y + 1).slice(2)} (1 Jul ${y} – 30 Jun ${y + 1})` }
}

/** Live pull from Xero, shaped for this page. Returns null if Xero is unreachable. */
async function liveXero(): Promise<XeroSnapshot | null> {
  if (!xeroConfigured()) return null
  try {
    const fy = currentFY()
    const today = new Date().toISOString().slice(0, 10)
    const [pl, bs]: [FlatReport, FlatReport] = await Promise.all([getProfitAndLoss(fy.from, today), getBalanceSheet(today)])

    const skip = /^total|^gross profit$|^net profit$|^less /i
    const idx = (name: string) => pl.lines.findIndex((l) => l.name.toLowerCase() === name)
    const iTotal = idx('total income'), eTotal = idx('total operating expenses') >= 0 ? idx('total operating expenses') : idx('total expenses')
    const income = pl.lines.slice(0, iTotal < 0 ? 0 : iTotal).filter((l) => !skip.test(l.name) && l.amount !== 0).sort((a, b) => b.amount - a.amount)
    const expenses = pl.lines.slice(iTotal < 0 ? 0 : iTotal + 1, eTotal < 0 ? undefined : eTotal).filter((l) => !skip.test(l.name) && l.amount !== 0).sort((a, b) => b.amount - a.amount)

    const payg = pick(bs, 'PAYG Withholdings Payable')
    const sup = pick(bs, 'Superannuation Payable')
    const wages = pick(bs, 'Wages Payable - Payroll')

    return {
      as_at: today, source: 'Xero (live)', fy: fy.label,
      pnl: {
        income_total: pick(pl, 'total income'), income,
        expenses_total: pick(pl, 'total operating expenses') || pick(pl, 'total expenses'), expenses,
        net_profit: pick(pl, 'net profit'),
      },
      balance_sheet: {
        bank_total: pick(bs, 'total bank'),
        accounts_receivable: pick(bs, 'accounts receivable'),
        square_balance: pick(bs, 'square balance'),
        fixed_assets: pick(bs, 'total fixed assets'),
        total_assets: pick(bs, 'total assets'),
        payg_withholding_payable: payg, super_payable: sup, wages_payable: wages,
        loan: pick(bs, 'loan'),
        total_liabilities: pick(bs, 'total liabilities'),
        net_assets: pick(bs, 'net assets'),
        retained_earnings: pick(bs, 'retained earnings'),
        current_year_earnings: pick(bs, 'current year earnings'),
        prior_year_net_assets: pickPrior(bs, 'net assets'),
        prior_year_bank: pickPrior(bs, 'total bank'),
      },
      owed_now: { label: 'Owed to ATO & staff', payg, super: sup, wages, total: +(payg + sup + wages).toFixed(2) },
    }
  } catch { return null }
}

export async function getCompanyPosition(): Promise<CompanyPosition> {
  const admin = createAdminSupabase()

  const [live, { data: snapRow }, stripe, { count: activeStudents }, { count: familyCount }, { count: payingFams }] = await Promise.all([
    liveXero(),
    admin.from('integration_state').select('value').eq('tenant_id', TENANT).eq('key', 'xero_snapshot').maybeSingle(),
    liveStripeBook(),
    admin.from('enrolments').select('student_id', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('families').select('id', { count: 'exact', head: true }).eq('tenant_id', TENANT),
    admin.from('families').select('id', { count: 'exact', head: true }).eq('tenant_id', TENANT).gt('weekly_fee_total', 0),
  ])

  // Live Xero wins; the stored snapshot is the fallback if Xero is unreachable.
  const xero = live ?? ((snapRow?.value as XeroSnapshot) ?? null)
  const students = {
    active: activeStudents ?? 0,
    families: familyCount ?? 0,
    payingFamilies: payingFams ?? 0,
    notPaying: Math.max(0, (activeStudents ?? 0) - (payingFams ?? 0)),
  }

  // Alerts — what actually needs Rhett's attention, biggest money first
  const alerts: CompanyPosition['alerts'] = []
  if (xero) {
    const b = xero.balance_sheet
    if (b.payg_withholding_payable > 0) alerts.push({ level: 'critical', title: 'PAYG withholding owed to the ATO', detail: 'Sitting on the balance sheet — must be paid with your BAS.', amount: b.payg_withholding_payable })
    if (b.super_payable > 0) alerts.push({ level: 'critical', title: 'Superannuation payable', detail: 'Under Payday Super this must reach the fund within 7 business days of each payday.', amount: b.super_payable })
    if (b.wages_payable > 0) alerts.push({ level: 'warn', title: 'Wages payable', detail: 'Accrued wages not yet paid out.', amount: b.wages_payable })
    if (b.square_balance < 0) alerts.push({ level: 'warn', title: 'Square balance is negative', detail: 'Worth checking with Lana — a negative clearing balance usually means unreconciled fees or refunds.', amount: b.square_balance })
    if (b.accounts_receivable > 0) alerts.push({ level: 'info', title: 'Money owed to you (receivables)', detail: 'Unpaid invoices out with customers.', amount: b.accounts_receivable })
  }
  if (stripe.pastDue > 0) {
    const lost = +(stripe.failing.reduce((n, f) => n + f.amount, 0)).toFixed(2)
    alerts.push({ level: 'critical', title: `${stripe.pastDue} subscriptions are failing to collect`, detail: 'Cards declining or unpaid — this is revenue leaking every week.', amount: lost })
  }
  return { xero, stripe, students, alerts }
}
