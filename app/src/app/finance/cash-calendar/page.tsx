import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { getBalanceSheet, pick, xeroConfigured, type FlatReport } from '@/lib/xero'

export const dynamic = 'force-dynamic'

type Ob = {
  title: string
  dueISO: string
  amount: number | null
  category: 'BAS' | 'Super' | 'Wages' | 'Info'
  detail: string
}

const DAY = 86_400_000
const fmtDate = (iso: string) => {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}
const money = (n: number | null) =>
  n == null ? '—' : (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Next quarterly BAS due date on/after `today` (lodging yourself — agents differ).
// Q3 Jan–Mar→28 Apr · Q4 Apr–Jun→28 Jul · Q1 Jul–Sep→28 Oct · Q2 Oct–Dec→28 Feb.
function nextBAS(today: Date): { dueISO: string; covers: string } {
  const y = today.getFullYear()
  const cands = [
    { m: 3, d: 28, covers: 'Jan–Mar quarter' },
    { m: 6, d: 28, covers: 'Apr–Jun quarter' },
    { m: 9, d: 28, covers: 'Jul–Sep quarter' },
    { m: 1, d: 28, covers: 'Oct–Dec quarter' }, // due in following year
  ]
  const dates: { dueISO: string; covers: string }[] = []
  for (const yr of [y, y + 1]) {
    for (const c of cands) {
      const due = new Date(yr, c.m, c.d)
      if (due >= new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        dates.push({ dueISO: due.toISOString().slice(0, 10), covers: c.covers })
      }
    }
  }
  dates.sort((a, b) => a.dueISO.localeCompare(b.dueISO))
  return dates[0]!
}

export default async function CashCalendarPage() {
  const user = await verifySession()
  const ownerOrManager = user.role === 'owner' || user.role === 'manager'

  const today = new Date()
  const todayISO = today.toISOString().slice(0, 10)

  let bs: FlatReport | null = null
  let xeroError: string | null = null
  const configured = xeroConfigured()
  if (configured && ownerOrManager) {
    try {
      bs = await getBalanceSheet(todayISO)
    } catch (e) {
      xeroError = e instanceof Error ? e.message : 'Could not reach Xero.'
    }
  }

  const gst = bs ? pick(bs, 'GST') : null // negative in Xero = refund owed TO you
  const paygW = bs ? pick(bs, 'PAYG Withholdings Payable') : null
  const superPayable = bs ? pick(bs, 'Superannuation Payable') : null
  const wagesPayable = bs ? pick(bs, 'Wages Payable - Payroll') : null

  const bas = nextBAS(today)
  const gstOwing = gst == null ? null : Math.max(0, gst)
  const gstRefund = gst == null ? 0 : Math.max(0, -gst)
  const basNet = paygW == null && gstOwing == null ? null : (paygW ?? 0) + (gstOwing ?? 0) - gstRefund

  const obligations: Ob[] = []

  // Near-term statutory transition notes (Australia, FY2026).
  obligations.push({
    title: 'Free ATO super clearing house (SBSCH) closes',
    dueISO: '2026-06-30',
    amount: null,
    category: 'Info',
    detail: 'After this you pay super through your fund portals or a paid clearing house. Set this up before it closes.',
  })
  obligations.push({
    title: 'Payday Super begins',
    dueISO: '2026-07-01',
    amount: null,
    category: 'Info',
    detail: 'From today, super (12%) must reach the fund within 7 business days of each payday — handled in Payroll & Super.',
  })

  // Q4 FY2026 super (Apr–Jun) under the old quarterly rule.
  obligations.push({
    title: 'Super Guarantee — Apr–Jun quarter',
    dueISO: '2026-07-28',
    amount: superPayable,
    category: 'Super',
    detail: 'The 12% super on wages for the April–June quarter. Live figure is what Xero currently shows as owing.',
  })

  // Next BAS (GST + PAYG withholding).
  obligations.push({
    title: `BAS — ${bas.covers}`,
    dueISO: bas.dueISO,
    amount: basNet,
    category: 'BAS',
    detail:
      gstRefund > 0
        ? `Includes PAYG tax withheld (${money(paygW)}) less a GST refund of ${money(gstRefund)} owed to you.`
        : `Includes GST (${money(gstOwing)}) plus PAYG tax withheld from wages (${money(paygW)}).`,
  })

  // Net wages owed to staff (cash, not statutory) — only if there's a balance.
  if (wagesPayable && Math.abs(wagesPayable) > 1) {
    obligations.push({
      title: 'Net wages owed to staff',
      dueISO: todayISO,
      amount: wagesPayable,
      category: 'Wages',
      detail: 'What Xero shows as owed to your team from processed pay runs not yet paid out.',
    })
  }

  // Sort by due date, drop anything already past (keep today).
  const upcoming = obligations
    .filter((o) => new Date(o.dueISO + 'T00:00:00') >= new Date(todayISO + 'T00:00:00') || o.category === 'Wages')
    .sort((a, b) => a.dueISO.localeCompare(b.dueISO))

  const catColour: Record<Ob['category'], string> = {
    BAS: 'bg-rose-50 border-rose-200 text-rose-700',
    Super: 'bg-violet-50 border-violet-200 text-violet-700',
    Wages: 'bg-sky-50 border-sky-200 text-sky-700',
    Info: 'bg-zinc-50 border-zinc-200 text-zinc-600',
  }

  const totalDue = upcoming
    .filter((o) => o.category !== 'Info' && o.amount && o.amount > 0)
    .reduce((s, o) => s + (o.amount ?? 0), 0)

  return (
    <DashboardShell
      user={user}
      currentPath="/finance/cash-calendar"
      pageTitle="📅 Money Due"
      pageSubtitle="What's coming up — tax, super and wages — with live amounts from Xero"
    >
      <div className="max-w-3xl space-y-5">
        {!ownerOrManager && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
            Money Due is for the business owner only.
          </div>
        )}

        {ownerOrManager && (
          <>
            {!configured && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
                Xero isn&apos;t connected yet, so the dollar amounts are blank — the due dates are still correct. Once Xero is
                linked, the live amounts fill in automatically.
              </div>
            )}
            {configured && xeroError && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
                Couldn&apos;t reach Xero just now — dates are shown, amounts will return on refresh.
              </div>
            )}

            {/* Total coming up */}
            <div className="bg-gradient-to-br from-rose-600 to-rose-500 text-white rounded-2xl p-6">
              <div className="text-sm text-rose-100">Roughly due in the next while</div>
              <div className="text-3xl font-bold tabular-nums mt-1">{money(totalDue || null)}</div>
              <div className="text-xs text-rose-100 mt-2">
                Tax + super owing right now per Xero. Keep this much aside so nothing catches you out.
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-3">
              {upcoming.map((o, i) => {
                const days = Math.round((new Date(o.dueISO + 'T00:00:00').getTime() - new Date(todayISO + 'T00:00:00').getTime()) / DAY)
                const soon = o.category !== 'Info' && days <= 14
                return (
                  <div key={i} className={`bg-white border rounded-2xl p-5 ${soon ? 'border-rose-200 ring-1 ring-rose-100' : 'border-zinc-200'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${catColour[o.category]}`}>{o.category}</span>
                          <h3 className="font-bold text-zinc-900">{o.title}</h3>
                        </div>
                        <p className="text-sm text-zinc-500 mt-1.5 max-w-xl">{o.detail}</p>
                      </div>
                      {o.amount != null && (
                        <div className="text-right shrink-0">
                          <div className="font-bold tabular-nums text-zinc-900">{money(o.amount)}</div>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-zinc-50 flex items-center justify-between text-sm">
                      <span className="text-zinc-600">{fmtDate(o.dueISO)}</span>
                      {o.category === 'Wages' ? (
                        <span className="text-sky-600 font-medium">Outstanding now</span>
                      ) : days < 0 ? (
                        <span className="text-rose-600 font-semibold">Overdue</span>
                      ) : days === 0 ? (
                        <span className="text-rose-600 font-semibold">Due today</span>
                      ) : (
                        <span className={soon ? 'text-rose-600 font-semibold' : 'text-zinc-500'}>in {days} days</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="text-xs text-zinc-400">
              Dates are the standard ATO due dates for lodging yourself — if your accountant lodges for you, some can be a
              little later. Amounts are what Xero shows owing today and will change as you trade. Always confirm with your
              accountant before paying.
            </p>
          </>
        )}
      </div>
    </DashboardShell>
  )
}
