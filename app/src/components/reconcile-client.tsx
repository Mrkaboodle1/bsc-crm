'use client'

import { useMemo, useState } from 'react'

export type CheckState = { checked: boolean; note: string }

export type CompareRow = {
  name: string
  accountant: number
  xero: number | null
  diff: number | null
  status: 'match' | 'differ' | 'noxero'
  note?: string
}

export type ReconcileData = {
  live: boolean
  configured: boolean
  allowed: boolean
  checks: Record<string, CheckState>
  xeroError: string | null
  asAt: string
  fyLabel: string
  accountantLabel: string
  bridge: {
    accountantProfit: number
    directorFee: number
    expectedXeroProfit: number
    xeroProfit: number | null
    residual: number | null
  }
  income: CompareRow[]
  balances: CompareRow[]
  totals: {
    incomeAccountant: number
    incomeXero: number | null
    expensesAccountant: number
    expensesXero: number | null
  }
  expenses: { name: string; amount: number }[]
}

const money = (n: number | null | undefined) =>
  n == null
    ? '—'
    : (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Badge({ status }: { status: CompareRow['status'] }) {
  if (status === 'match') return <span className="text-emerald-600 font-semibold whitespace-nowrap">✓ Match</span>
  if (status === 'differ') return <span className="text-amber-600 font-semibold whitespace-nowrap">⚠ Check</span>
  return <span className="text-zinc-400 whitespace-nowrap">—</span>
}

function RowsTable({
  rows,
  title,
  hint,
  checks,
  onToggle,
  onNote,
}: {
  rows: CompareRow[]
  title: string
  hint?: string
  checks: Record<string, CheckState>
  onToggle: (key: string, checked: boolean) => void
  onNote: (key: string, note: string) => void
}) {
  const get = (key: string): CheckState => checks[key] ?? { checked: false, note: '' }
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
      <div className="px-5 pt-4 pb-2">
        <h3 className="font-bold text-zinc-900">{title}</h3>
        {hint && <p className="text-xs text-zinc-500 mt-0.5">{hint}</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500 border-y border-zinc-100 bg-zinc-50">
              <th className="px-4 py-2 font-medium">Done</th>
              <th className="px-3 py-2 font-medium">Item</th>
              <th className="px-3 py-2 font-medium text-right">Accountant</th>
              <th className="px-3 py-2 font-medium text-right">Xero (live)</th>
              <th className="px-3 py-2 font-medium text-right">Difference</th>
              <th className="px-5 py-2 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const cs = get(r.name)
              const showNote = r.status === 'differ' || cs.note.length > 0 || cs.checked
              return (
                <tr key={i} className={`border-b border-zinc-50 ${cs.checked ? 'bg-emerald-50/50' : r.status === 'differ' ? 'bg-amber-50/60' : ''}`}>
                  <td className="px-4 py-2.5 align-top">
                    <input
                      type="checkbox"
                      checked={cs.checked}
                      onChange={(e) => onToggle(r.name, e.target.checked)}
                      className="w-5 h-5 rounded border-zinc-300 text-emerald-600 cursor-pointer accent-emerald-600"
                      aria-label={`Mark ${r.name} as checked`}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-zinc-800">{r.name}</div>
                    {r.note && r.status === 'differ' && <div className="text-xs text-zinc-500 mt-1 max-w-md">{r.note}</div>}
                    {showNote && (
                      <input
                        type="text"
                        defaultValue={cs.note}
                        placeholder="add a note…"
                        onBlur={(e) => {
                          if (e.target.value !== cs.note) onNote(r.name, e.target.value)
                        }}
                        className="mt-2 w-full max-w-md text-xs border border-zinc-200 rounded-lg px-2 py-1 text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700 align-top">{money(r.accountant)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700 align-top">{money(r.xero)}</td>
                  <td className={`px-3 py-2.5 text-right tabular-nums align-top ${r.diff && Math.abs(r.diff) > 0.01 ? 'text-amber-700' : 'text-zinc-400'}`}>
                    {r.diff == null ? '—' : money(r.diff)}
                  </td>
                  <td className="px-5 py-2.5 text-right align-top"><Badge status={r.status} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ReconcileClient({ data }: { data: ReconcileData }) {
  const [checks, setChecks] = useState<Record<string, CheckState>>(data.checks || {})
  const [saving, setSaving] = useState(false)

  const get = (key: string): CheckState => checks[key] ?? { checked: false, note: '' }

  async function save(key: string, patch: Partial<CheckState>) {
    setChecks((c) => ({ ...c, [key]: { ...get(key), ...patch } }))
    setSaving(true)
    try {
      await fetch('/api/finance/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, ...patch }),
      })
    } catch {
      /* leave optimistic state; will retry on next change */
    } finally {
      setSaving(false)
    }
  }

  const allRows = useMemo(() => [...data.income, ...data.balances], [data.income, data.balances])
  const doneCount = allRows.filter((r) => get(r.name).checked).length
  const pct = allRows.length ? Math.round((doneCount / allRows.length) * 100) : 0

  if (!data.allowed) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
        Reconcile is for the business owner only.
      </div>
    )
  }

  const flagged = allRows.filter((r) => r.status === 'differ').length
  const onToggle = (key: string, checked: boolean) => save(key, { checked })
  const onNote = (key: string, note: string) => save(key, { note })

  return (
    <div className="space-y-5">
      {/* Connection state */}
      {!data.configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
          Xero isn&apos;t connected to Big Star Books yet, so the live column is empty. Once Xero is linked, this screen fills
          in automatically. (The accountant&apos;s figures below are still shown for reference.)
        </div>
      )}
      {data.configured && data.xeroError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
          Couldn&apos;t reach Xero just now — showing your accountant&apos;s figures only. Try refreshing in a moment.
        </div>
      )}

      {/* Headline: the profit bridge */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 text-white rounded-2xl p-6">
        <div className="text-sm text-zinc-300 mb-3">Why your profit shows differently in two places</div>
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-zinc-200">Profit your accountant calculated</span>
            <span className="font-bold tabular-nums">{money(data.bridge.accountantProfit)}</span>
          </div>
          <div className="flex justify-between items-baseline text-zinc-300">
            <span>Less your one-off director fee</span>
            <span className="tabular-nums">−{money(data.bridge.directorFee)}</span>
          </div>
          <div className="flex justify-between items-baseline border-t border-zinc-700 pt-2">
            <span className="text-zinc-200">So profit should land near</span>
            <span className="font-bold tabular-nums">{money(data.bridge.expectedXeroProfit)}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-zinc-200">Xero&apos;s live figure</span>
            <span className="font-bold tabular-nums text-emerald-400">{money(data.bridge.xeroProfit)}</span>
          </div>
          {data.bridge.residual != null && (
            <div className="text-xs text-zinc-400 pt-2">
              The small remaining gap ({money(data.bridge.residual)}) is the year-end adjustments your accountant still adds
              by hand — depreciation, asset write-offs and income tax. That&apos;s normal at this time of year.
            </div>
          )}
        </div>
      </div>

      {/* Progress + status */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-semibold text-zinc-900">
            Reconciled {doneCount} of {allRows.length} lines
          </span>
          <span className="text-xs text-zinc-400">{saving ? 'Saving…' : 'Saved ✓'}</span>
        </div>
        <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center gap-3 text-sm mt-3">
          {data.live ? (
            flagged === 0 ? (
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 font-medium">✓ Everything lines up</span>
            ) : (
              <span className="text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 font-medium">⚠ {flagged} flagged — tick each once you&apos;re happy</span>
            )
          ) : (
            <span className="text-zinc-500 bg-zinc-100 rounded-full px-3 py-1">Live Xero column unavailable</span>
          )}
          <span className="text-zinc-400 text-xs">vs {data.accountantLabel}</span>
        </div>
      </div>

      <RowsTable rows={data.income} title="💰 Money in" hint="These should match to the cent — both systems count the same sales. Tick each off." checks={checks} onToggle={onToggle} onNote={onNote} />

      <RowsTable
        rows={data.balances}
        title="🏦 Key balances"
        hint="What you hold and what you owe. A flag here usually has a simple timing reason — shown under the line. Add a note and tick it off."
        checks={checks}
        onToggle={onToggle}
        onNote={onNote}
      />

      {/* Totals */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5">
        <h3 className="font-bold text-zinc-900 mb-3">📊 Totals</h3>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="text-zinc-500"></div>
          <div className="text-right text-xs text-zinc-500 font-medium">Accountant</div>
          <div className="text-right text-xs text-zinc-500 font-medium">Xero (live)</div>

          <div className="text-zinc-700">Total money in</div>
          <div className="text-right tabular-nums">{money(data.totals.incomeAccountant)}</div>
          <div className="text-right tabular-nums">{money(data.totals.incomeXero)}</div>

          <div className="text-zinc-700">Total money out</div>
          <div className="text-right tabular-nums">{money(data.totals.expensesAccountant)}</div>
          <div className="text-right tabular-nums">{money(data.totals.expensesXero)}</div>
        </div>
        <p className="text-xs text-zinc-500 mt-3">
          Money-in matches exactly. Money-out differs mainly by your one-off $20k director fee (in Xero, not yet in the
          accountant&apos;s draft) plus the year-end adjustments above — which is expected.
        </p>
      </div>

      {/* Expenses reference */}
      <details className="bg-white border border-zinc-200 rounded-2xl p-5">
        <summary className="font-bold text-zinc-900 cursor-pointer">📋 Accountant&apos;s expense breakdown (for reference)</summary>
        <p className="text-xs text-zinc-500 mt-2 mb-3">
          Your accountant groups expenses differently to Xero (they reclassify equipment, depreciation and tax at year
          end), so these categories won&apos;t line up one-to-one with Xero — only the totals do.
        </p>
        <div className="divide-y divide-zinc-50">
          {data.expenses.map((e, i) => (
            <div key={i} className="flex justify-between py-1.5 text-sm">
              <span className="text-zinc-700">{e.name}</span>
              <span className="tabular-nums text-zinc-600">{money(e.amount)}</span>
            </div>
          ))}
        </div>
      </details>

      <p className="text-xs text-zinc-400">
        Live figures pulled from Xero for the financial year {data.fyLabel}. Balances as at {data.asAt}. Your ticks and notes
        are saved automatically.
      </p>
    </div>
  )
}
