import { verifySession } from '@/lib/dal'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { getCompanyPosition } from '@/lib/company-position'

export const dynamic = 'force-dynamic'

const money = (n: number) => (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const money0 = (n: number) => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-AU')

export default async function PositionPage() {
  const user = await verifySession()
  if (!['owner', 'manager'].includes(user.role)) redirect('/dashboard')
  const pos = await getCompanyPosition()
  const x = pos.xero

  const ALERT_STYLE = {
    critical: 'border-red-300 bg-red-50 text-red-900',
    warn: 'border-amber-300 bg-amber-50 text-amber-900',
    info: 'border-blue-200 bg-blue-50 text-blue-900',
  } as const

  return (
    <DashboardShell user={user} currentPath="/finance/position" pageTitle="Where the business stands" pageSubtitle="Your whole company in one screen — pulled from Xero, Stripe and the CRM.">
      <style>{`@media print{.no-print{display:none!important}}`}</style>

      {/* Needs attention */}
      {pos.alerts.length > 0 && (
        <section className="mb-7">
          <h2 className="text-sm font-black uppercase tracking-wide text-zinc-500 mb-2">⚠️ Needs your attention</h2>
          <div className="grid gap-2">
            {pos.alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-3 border-2 rounded-xl px-4 py-3 ${ALERT_STYLE[a.level]}`}>
                <span className="text-lg leading-none mt-0.5">{a.level === 'critical' ? '🔴' : a.level === 'warn' ? '🟡' : '🔵'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-black">{a.title}</div>
                  <div className="text-sm opacity-80">{a.detail}</div>
                </div>
                {a.amount !== undefined && <div className="font-black text-lg whitespace-nowrap tabular-nums">{money0(a.amount)}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Headline numbers */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        <Stat label="In the bank" value={x ? money0(x.balance_sheet.bank_total) : '—'} sub={x ? `was ${money0(x.balance_sheet.prior_year_bank)} last year` : ''} good={!!x && x.balance_sheet.bank_total > x.balance_sheet.prior_year_bank} />
        <Stat label="Weekly recurring" value={money0(pos.stripe.weeklyRecurring)} sub={`${pos.stripe.active} active subscriptions`} good />
        <Stat label="Annualised from subs" value={money0(pos.stripe.annualisedRevenue)} sub="weekly × 52" />
        <Stat label="Owed to ATO & staff" value={x ? money0(x.owed_now.total) : '—'} sub="PAYG + super + wages" alert />
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* P&L */}
        {x && (
          <section className="bg-white rounded-2xl border border-zinc-200 p-5">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="font-black text-zinc-900">Profit &amp; Loss</h2>
              <span className="text-xs text-zinc-400">{x.fy}</span>
            </div>
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-3xl font-black text-emerald-600 tabular-nums">{money(x.pnl.net_profit)}</span>
              <span className="text-sm text-zinc-500">net profit</span>
            </div>
            <Bar label="Income" amount={x.pnl.income_total} max={x.pnl.income_total} tone="emerald" />
            <Bar label="Expenses" amount={x.pnl.expenses_total} max={x.pnl.income_total} tone="red" />
            <div className="mt-4 text-[11px] font-black uppercase tracking-wider text-zinc-400">Where the money came from</div>
            <ul className="mt-1 divide-y divide-zinc-100">
              {x.pnl.income.filter((r) => r.amount > 100).map((r) => (
                <li key={r.name} className="flex justify-between py-1.5 text-sm"><span className="text-zinc-700">{r.name}</span><span className="font-bold tabular-nums">{money0(r.amount)}</span></li>
              ))}
            </ul>
            <div className="mt-4 text-[11px] font-black uppercase tracking-wider text-zinc-400">Biggest costs</div>
            <ul className="mt-1 divide-y divide-zinc-100">
              {x.pnl.expenses.slice(0, 8).map((r) => (
                <li key={r.name} className="flex justify-between py-1.5 text-sm"><span className="text-zinc-700">{r.name}</span><span className="font-bold tabular-nums">{money0(r.amount)}</span></li>
              ))}
            </ul>
          </section>
        )}

        <div className="space-y-6">
          {/* Subscription book */}
          <section className="bg-white rounded-2xl border border-zinc-200 p-5">
            <h2 className="font-black text-zinc-900 mb-3">Subscription book <span className="text-xs font-normal text-emerald-600">● live from Stripe</span></h2>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <MiniStat label="Active" value={pos.stripe.active} tone="emerald" />
              <MiniStat label="Failing" value={pos.stripe.pastDue} tone={pos.stripe.pastDue > 0 ? 'red' : 'zinc'} />
              <MiniStat label="Cancelled" value={pos.stripe.cancelled} tone="zinc" />
            </div>
            {pos.stripe.failing.length > 0 && (
              <>
                <div className="text-[11px] font-black uppercase tracking-wider text-red-600 mb-1">Chase these — payment failing</div>
                <ul className="divide-y divide-zinc-100">
                  {pos.stripe.failing.slice(0, 15).map((f, i) => (
                    <li key={i} className="flex items-center justify-between py-1.5 text-sm gap-2">
                      <div className="min-w-0"><div className="font-bold text-zinc-800 truncate">{f.name}</div>{f.email && <div className="text-[11px] text-zinc-400 truncate">{f.email}</div>}</div>
                      <span className="font-bold tabular-nums text-red-600 whitespace-nowrap">{money(f.amount)}/wk</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* Balance sheet */}
          {x && (
            <section className="bg-white rounded-2xl border border-zinc-200 p-5">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-black text-zinc-900">What the business owns &amp; owes</h2>
                <span className="text-xs text-zinc-400">as at {x.as_at}</span>
              </div>
              <dl className="text-sm">
                <Row label="Bank accounts" value={money(x.balance_sheet.bank_total)} />
                <Row label="Owed to you (invoices)" value={money(x.balance_sheet.accounts_receivable)} />
                <Row label="Vehicle &amp; equipment" value={money(x.balance_sheet.fixed_assets)} />
                <Row label="Total assets" value={money(x.balance_sheet.total_assets)} bold />
                <div className="h-2" />
                <Row label="PAYG owed to ATO" value={money(x.balance_sheet.payg_withholding_payable)} warn />
                <Row label="Super payable" value={money(x.balance_sheet.super_payable)} warn />
                <Row label="Wages payable" value={money(x.balance_sheet.wages_payable)} warn />
                <Row label="Loan" value={money(x.balance_sheet.loan)} />
                <div className="h-2" />
                <Row label="NET WORTH" value={money(x.balance_sheet.net_assets)} bold big />
                <Row label="…same time last year" value={money(x.balance_sheet.prior_year_net_assets)} muted />
              </dl>
            </section>
          )}

          {/* Students */}
          <section className="bg-white rounded-2xl border border-zinc-200 p-5">
            <h2 className="font-black text-zinc-900 mb-3">Students &amp; families</h2>
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Active enrolments" value={pos.students.active} tone="emerald" />
              <MiniStat label="Paying families" value={pos.students.payingFamilies} tone="emerald" />
              <MiniStat label="Contacts in CRM" value={pos.students.families} tone="zinc" />
            </div>
          </section>
        </div>
      </div>

      <p className="text-xs text-zinc-400 mt-6">
        Stripe figures are live and refresh every night. Xero figures are a snapshot taken {x?.as_at ?? '—'} — Xero isn&apos;t connected to this app directly, so they update when Jacky pulls them.
      </p>
    </DashboardShell>
  )
}

function Stat({ label, value, sub, good, alert }: { label: string; value: string; sub?: string; good?: boolean; alert?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${alert ? 'border-red-200 bg-red-50' : 'border-zinc-200 bg-white'}`}>
      <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`text-2xl font-black tabular-nums mt-1 ${alert ? 'text-red-700' : good ? 'text-emerald-600' : 'text-zinc-900'}`}>{value}</div>
      {sub && <div className="text-[11px] text-zinc-400 mt-0.5">{sub}</div>}
    </div>
  )
}
function Bar({ label, amount, max, tone }: { label: string; amount: number; max: number; tone: 'emerald' | 'red' }) {
  const pct = max > 0 ? Math.min(100, (amount / max) * 100) : 0
  const bg = tone === 'emerald' ? 'bg-emerald-500' : 'bg-red-400'
  return (
    <div className="mb-2">
      <div className="flex justify-between text-sm mb-1"><span className="text-zinc-600">{label}</span><span className="font-bold tabular-nums">{money0(amount)}</span></div>
      <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden"><div className={`h-full ${bg} rounded-full`} style={{ width: `${pct}%` }} /></div>
    </div>
  )
}
function MiniStat({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'red' | 'zinc' }) {
  const c = tone === 'emerald' ? 'text-emerald-600' : tone === 'red' ? 'text-red-600' : 'text-zinc-700'
  return (
    <div className="bg-zinc-50 rounded-xl px-2 py-2.5 text-center">
      <div className={`text-xl font-black tabular-nums ${c}`}>{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 leading-tight mt-0.5">{label}</div>
    </div>
  )
}
function Row({ label, value, bold, big, warn, muted }: { label: string; value: string; bold?: boolean; big?: boolean; warn?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 ${bold ? 'border-t border-zinc-200 mt-1 pt-2' : ''}`}>
      <dt className={`${bold ? 'font-black' : ''} ${muted ? 'text-zinc-400' : 'text-zinc-600'}`} dangerouslySetInnerHTML={{ __html: label }} />
      <dd className={`tabular-nums ${big ? 'text-lg' : ''} ${bold ? 'font-black' : 'font-bold'} ${warn ? 'text-red-600' : muted ? 'text-zinc-400' : 'text-zinc-900'}`}>{value}</dd>
    </div>
  )
}
