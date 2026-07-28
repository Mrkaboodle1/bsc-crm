import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { getUnpaidInvoices, xeroConfigured, type UnpaidInvoice } from '@/lib/xero'

export const dynamic = 'force-dynamic'

const money = (n: number) => '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default async function OwedPage() {
  const user = await verifySession()
  const ownerOrManager = user.role === 'owner' || user.role === 'manager'
  const todayISO = new Date().toISOString().slice(0, 10)

  let invoices: UnpaidInvoice[] | null = null
  let xeroError: string | null = null
  const configured = xeroConfigured()
  if (configured && ownerOrManager) {
    try {
      invoices = await getUnpaidInvoices()
    } catch (e) {
      xeroError = e instanceof Error ? e.message : 'Could not reach Xero.'
    }
  }

  const total = (invoices ?? []).reduce((s, i) => s + i.amountDue, 0)
  const overdue = (invoices ?? []).filter((i) => i.dueISO && i.dueISO < todayISO)
  const overdueTotal = overdue.reduce((s, i) => s + i.amountDue, 0)

  return (
    <DashboardShell
      user={user}
      currentPath="/finance/owed"
      pageTitle="📥 Who Owes You"
      pageSubtitle="Unpaid customer invoices, soonest due first — chase the money owed to you"
    >
      <div className="max-w-3xl space-y-5">
        {!ownerOrManager && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
            This is for the business owner only.
          </div>
        )}

        {ownerOrManager && (
          <>
            {!configured && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
                Xero isn&apos;t connected yet, so there&apos;s nothing to show here. Once linked, your unpaid invoices appear
                automatically.
              </div>
            )}
            {configured && xeroError && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
                Couldn&apos;t reach Xero just now — please refresh in a moment.
              </div>
            )}

            {invoices && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-sky-600 to-sky-500 text-white rounded-2xl p-5">
                    <div className="text-sm text-sky-100">Total owed to you</div>
                    <div className="text-3xl font-bold tabular-nums mt-1">{money(total)}</div>
                    <div className="text-xs text-sky-100 mt-1">{invoices.length} unpaid invoice{invoices.length === 1 ? '' : 's'}</div>
                  </div>
                  <div className={`rounded-2xl p-5 border ${overdueTotal > 0 ? 'bg-rose-50 border-rose-200' : 'bg-zinc-50 border-zinc-200'}`}>
                    <div className="text-sm text-zinc-500">Overdue</div>
                    <div className={`text-3xl font-bold tabular-nums mt-1 ${overdueTotal > 0 ? 'text-rose-600' : 'text-zinc-400'}`}>{money(overdueTotal)}</div>
                    <div className="text-xs text-zinc-400 mt-1">{overdue.length} past their due date</div>
                  </div>
                </div>

                {invoices.length === 0 ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center text-emerald-800">
                    🎉 Nothing outstanding — every invoice is paid. Lovely.
                  </div>
                ) : (
                  <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-zinc-500 border-b border-zinc-100 bg-zinc-50">
                            <th className="px-5 py-2.5 font-medium">Customer</th>
                            <th className="px-3 py-2.5 font-medium">Invoice</th>
                            <th className="px-3 py-2.5 font-medium">Due</th>
                            <th className="px-5 py-2.5 font-medium text-right">Amount due</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.map((inv, i) => {
                            const isOverdue = inv.dueISO && inv.dueISO < todayISO
                            return (
                              <tr key={i} className={`border-b border-zinc-50 ${isOverdue ? 'bg-rose-50/50' : ''}`}>
                                <td className="px-5 py-3 text-zinc-800">{inv.contact}</td>
                                <td className="px-3 py-3 text-zinc-500">{inv.number}</td>
                                <td className="px-3 py-3">
                                  <span className={isOverdue ? 'text-rose-600 font-medium' : 'text-zinc-600'}>{fmtDate(inv.dueISO)}</span>
                                  {isOverdue && <span className="text-rose-500 text-xs ml-1">overdue</span>}
                                </td>
                                <td className="px-5 py-3 text-right tabular-nums font-medium text-zinc-900">{money(inv.amountDue)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <p className="text-xs text-zinc-400">
                  Live from Xero — only sent (authorised) invoices that are still unpaid. Drafts aren&apos;t counted.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  )
}
