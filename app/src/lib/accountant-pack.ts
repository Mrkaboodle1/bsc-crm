// Big Star Books — Accountant Pack builder (inspired by the pDOG P&L app).
// Compiles one month of reconciled bank activity into a clean package for the
// accountant: income & expenses by category, GST position, payroll, unpaid
// invoices — plus a warning for anything still needing a category.
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

const r2 = (n: number) => Math.round(n * 100) / 100

export type Pack = {
  month: string
  monthLabel: string
  income: { label: string; amount: number }[]
  incomeTotal: number
  expenses: { label: string; amount: number }[]
  expenseTotal: number
  net: number
  gst: { collected: number; credits: number; net: number }
  needsReview: number
  personalTotal: number
  payroll: { gross: number; super: number; runs: number } | null
  unpaid: { count: number; total: number }
  txnCount: number
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
}

export async function buildPack(admin: SupabaseClient, tenantId: string, ym: string): Promise<Pack> {
  const [y, m] = ym.split('-').map(Number)
  const start = `${ym}-01`
  const endD = new Date(y, m, 1) // first of next month
  const end = endD.toISOString().slice(0, 10)

  const { data: txns } = await admin.from('bank_transactions').select('amount, direction, status, category, gst, is_personal')
    .eq('tenant_id', tenantId).gte('txn_date', start).lt('txn_date', end)

  const incomeMap: Record<string, number> = {}
  const expenseMap: Record<string, number> = {}
  let gstCollected = 0, gstCredits = 0, needsReview = 0, personalTotal = 0

  for (const t of txns ?? []) {
    if (t.status === 'needs_review') { needsReview++; continue }
    if (t.is_personal) { personalTotal += Math.abs(Number(t.amount)); continue }
    const cat = t.category || 'Uncategorised'
    const amt = Math.abs(Number(t.amount))
    if (t.direction === 'in') {
      incomeMap[cat] = (incomeMap[cat] || 0) + amt
      if (t.gst) gstCollected += amt / 11
    } else {
      expenseMap[cat] = (expenseMap[cat] || 0) + amt
      if (t.gst) gstCredits += amt / 11
    }
  }

  const income = Object.entries(incomeMap).map(([label, amount]) => ({ label, amount: r2(amount) })).sort((a, b) => b.amount - a.amount)
  const expenses = Object.entries(expenseMap).map(([label, amount]) => ({ label, amount: r2(amount) })).sort((a, b) => b.amount - a.amount)
  const incomeTotal = r2(income.reduce((s, e) => s + e.amount, 0))
  const expenseTotal = r2(expenses.reduce((s, e) => s + e.amount, 0))

  // Payroll (best effort — from recorded pay runs in the month).
  let payroll: Pack['payroll'] = null
  try {
    const { data: runs } = await admin.from('pay_runs').select('id').eq('tenant_id', tenantId).gte('pay_date', start).lt('pay_date', end)
    const ids = (runs ?? []).map((r) => r.id)
    if (ids.length) {
      const { data: items } = await admin.from('pay_items').select('gross, super').in('pay_run_id', ids)
      const gross = (items ?? []).reduce((s, i) => s + Number(i.gross || 0), 0)
      const sup = (items ?? []).reduce((s, i) => s + Number(i.super || 0), 0)
      payroll = { gross: r2(gross), super: r2(sup), runs: ids.length }
    }
  } catch { payroll = null }

  // Unpaid invoices snapshot.
  let unpaid = { count: 0, total: 0 }
  try {
    const { data: inv } = await admin.from('bs_invoices').select('total').eq('tenant_id', tenantId).in('status', ['awaiting', 'sent'])
    unpaid = { count: (inv ?? []).length, total: r2((inv ?? []).reduce((s, i) => s + Number(i.total), 0)) }
  } catch { /* table may be absent */ }

  return {
    month: ym, monthLabel: monthLabel(ym),
    income, incomeTotal, expenses, expenseTotal, net: r2(incomeTotal - expenseTotal),
    gst: { collected: r2(gstCollected), credits: r2(gstCredits), net: r2(gstCollected - gstCredits) },
    needsReview, personalTotal: r2(personalTotal), payroll, unpaid, txnCount: (txns ?? []).length,
  }
}

/** Plain CSV of the pack for the accountant. */
export function packCsv(pack: Pack): string {
  const lines: string[] = []
  lines.push(`Big Star Circus — Accountant Pack,${pack.monthLabel}`)
  lines.push('')
  lines.push('INCOME,Amount')
  pack.income.forEach((e) => lines.push(`${e.label.replace(/,/g, ' ')},${e.amount.toFixed(2)}`))
  lines.push(`Total income,${pack.incomeTotal.toFixed(2)}`)
  lines.push('')
  lines.push('EXPENSES,Amount')
  pack.expenses.forEach((e) => lines.push(`${e.label.replace(/,/g, ' ')},${e.amount.toFixed(2)}`))
  lines.push(`Total expenses,${pack.expenseTotal.toFixed(2)}`)
  lines.push('')
  lines.push(`Net profit,${pack.net.toFixed(2)}`)
  lines.push('')
  lines.push('GST POSITION (estimate),Amount')
  lines.push(`GST collected on income,${pack.gst.collected.toFixed(2)}`)
  lines.push(`GST credits on expenses,${pack.gst.credits.toFixed(2)}`)
  lines.push(`Net GST ${pack.gst.net >= 0 ? 'owed to ATO' : 'refund'},${Math.abs(pack.gst.net).toFixed(2)}`)
  if (pack.payroll) {
    lines.push('')
    lines.push('PAYROLL,Amount')
    lines.push(`Gross wages,${pack.payroll.gross.toFixed(2)}`)
    lines.push(`Superannuation,${pack.payroll.super.toFixed(2)}`)
  }
  return lines.join('\n')
}
