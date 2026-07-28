'use client'

import { useEffect, useState } from 'react'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/bank-categorise'

type Txn = {
  id: string
  txn_date: string
  amount: number
  direction: 'in' | 'out'
  description: string
  balance: number | null
  status: 'needs_review' | 'reconciled'
  category: string | null
  gst: boolean
  is_personal: boolean
  matched_invoice_id: string | null
  note: string | null
}
type Inv = { id: string; number: string; contact_name: string | null; total: number }
type Summary = { needsReview?: number; reconciled?: number; inMonth?: number; outMonth?: number; cash?: number | null }

const money = (n: number | null | undefined) =>
  n == null ? '—' : (n < 0 ? '-' : '') + '$' + Math.abs(Number(n)).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function BankClient() {
  const [txns, setTxns] = useState<Txn[]>([])
  const [invoices, setInvoices] = useState<Inv[]>([])
  const [summary, setSummary] = useState<Summary>({})
  const [missing, setMissing] = useState(false)
  const [tab, setTab] = useState<'needs_review' | 'reconciled'>('needs_review')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function load(t = tab) {
    const r = await fetch(`/api/finance/transactions?status=${t}`).then((x) => x.json()).catch(() => null)
    if (r?.missing) { setMissing(true); return }
    if (r?.ok) { setTxns(r.txns); setInvoices(r.invoices); setSummary(r.summary) }
  }
  useEffect(() => { load(tab) }, [tab])

  function patchLocal(id: string, p: Partial<Txn>) { setTxns((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t))) }

  async function importCsv(text: string) {
    setErr(null); setMsg(null); setBusy('import')
    const r = await fetch('/api/finance/bank-import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv: text }) }).then((x) => x.json()).catch(() => null)
    setBusy(null)
    if (r?.error === 'missing-table') { setMissing(true); return }
    if (!r?.ok) { setErr(r?.error || 'Import failed.'); return }
    setMsg(`Imported ${r.imported} new transaction${r.imported === 1 ? '' : 's'}${r.duplicates ? ` · skipped ${r.duplicates} already there` : ''}.`)
    setTab('needs_review'); load('needs_review')
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    const text = await f.text(); importCsv(text); e.target.value = ''
  }

  async function reconcile(t: Txn) {
    if (!t.category && !t.is_personal) { setErr('Pick a category first (or mark it personal).'); return }
    setErr(null); setBusy(t.id)
    const r = await fetch('/api/finance/transactions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, action: 'reconcile', category: t.category, gst: t.gst, is_personal: t.is_personal, matched_invoice_id: t.matched_invoice_id, note: t.note }) }).then((x) => x.json()).catch(() => null)
    setBusy(null)
    if (!r?.ok) { setErr(r?.error || 'Could not reconcile.'); return }
    setTxns((ts) => ts.filter((x) => x.id !== t.id))
    setSummary((s) => ({ ...s, needsReview: (s.needsReview || 1) - 1, reconciled: (s.reconciled || 0) + 1 }))
  }

  async function undo(t: Txn) {
    setBusy(t.id)
    await fetch('/api/finance/transactions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, action: 'unreconcile' }) })
    setBusy(null); setTxns((ts) => ts.filter((x) => x.id !== t.id))
  }

  async function reconcileAllSuggested() {
    const ready = txns.filter((t) => t.category && !t.is_personal)
    if (!ready.length) { setErr('No transactions have a suggested category to approve yet.'); return }
    if (!confirm(`Approve & reconcile ${ready.length} transactions that already have a suggested category?`)) return
    setBusy('bulk')
    for (const t of ready) {
      await fetch('/api/finance/transactions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, action: 'reconcile', category: t.category, gst: t.gst }) })
    }
    setBusy(null); load('needs_review')
  }

  if (missing) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
        Bank reconcile needs its database tables. Paste migration <strong>049_bigstar_books_bank.sql</strong> into Supabase, then refresh.
      </div>
    )
  }

  const cats = (d: 'in' | 'out') => (d === 'in' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-zinc-200 rounded-2xl p-4"><div className="text-xs text-zinc-500">Needs review</div><div className={`text-2xl font-bold tabular-nums ${summary.needsReview ? 'text-amber-600' : 'text-emerald-600'}`}>{summary.needsReview ?? 0}</div></div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4"><div className="text-xs text-zinc-500">Reconciled</div><div className="text-2xl font-bold tabular-nums text-zinc-800">{summary.reconciled ?? 0}</div></div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4"><div className="text-xs text-zinc-500">In this month</div><div className="text-xl font-bold tabular-nums text-emerald-700">{money(summary.inMonth)}</div></div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4"><div className="text-xs text-zinc-500">Out this month</div><div className="text-xl font-bold tabular-nums text-rose-600">{money(summary.outMonth)}</div></div>
      </div>

      {/* Import */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="font-bold text-zinc-900 text-sm">Import your CommBank file</div>
          <div className="text-xs text-zinc-500">Export your transactions from NetBank as CSV, then choose the file here. Duplicates are skipped automatically.</div>
        </div>
        <label className="bg-[#D72027] hover:bg-[#A0151B] text-white text-sm font-bold rounded-xl px-4 py-2 cursor-pointer">
          {busy === 'import' ? 'Importing…' : '⬆ Choose CSV file'}
          <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" disabled={busy === 'import'} />
        </label>
      </div>

      {msg && <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">{msg}</div>}
      {err && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{err}</div>}

      {/* Tabs + bulk */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 border-b border-zinc-200">
          {(['needs_review', 'reconciled'] as const).map((k) => (
            <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 text-sm font-bold border-b-2 ${tab === k ? 'border-[#D72027] text-[#D72027]' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}>
              {k === 'needs_review' ? `Needs review (${summary.needsReview ?? 0})` : `Reconciled (${summary.reconciled ?? 0})`}
            </button>
          ))}
        </div>
        {tab === 'needs_review' && txns.length > 0 && (
          <button onClick={reconcileAllSuggested} disabled={busy === 'bulk'} className="text-sm font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">
            {busy === 'bulk' ? 'Working…' : '✓ Approve all suggested'}
          </button>
        )}
      </div>

      {/* Transactions */}
      <div className="space-y-2">
        {txns.map((t) => (
          <div key={t.id} className="bg-white border border-zinc-200 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="text-sm text-zinc-800 break-words">{t.description || '(no description)'}</div>
                <div className="text-xs text-zinc-400 mt-0.5">{t.txn_date}{t.balance != null ? ` · balance ${money(t.balance)}` : ''}</div>
              </div>
              <div className={`font-bold tabular-nums shrink-0 ${t.direction === 'in' ? 'text-emerald-600' : 'text-zinc-800'}`}>{t.direction === 'in' ? '+' : ''}{money(t.amount)}</div>
            </div>

            {tab === 'needs_review' ? (
              <div className="mt-3 pt-3 border-t border-zinc-50 flex flex-wrap items-center gap-2">
                <select value={t.category || ''} onChange={(e) => patchLocal(t.id, { category: e.target.value || null })} className="border border-zinc-200 rounded-lg px-2 py-1.5 text-sm bg-white" disabled={t.is_personal}>
                  <option value="">— category —</option>
                  {cats(t.direction).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <label className="text-xs flex items-center gap-1 text-zinc-600"><input type="checkbox" checked={t.gst} onChange={(e) => patchLocal(t.id, { gst: e.target.checked })} className="w-4 h-4 accent-[#D72027]" disabled={t.is_personal} /> GST</label>
                <label className="text-xs flex items-center gap-1 text-zinc-600"><input type="checkbox" checked={t.is_personal} onChange={(e) => patchLocal(t.id, { is_personal: e.target.checked, category: e.target.checked ? null : t.category })} className="w-4 h-4 accent-amber-500" /> Personal / director loan</label>
                {t.direction === 'in' && invoices.length > 0 && (
                  <select value={t.matched_invoice_id || ''} onChange={(e) => patchLocal(t.id, { matched_invoice_id: e.target.value || null })} className="border border-zinc-200 rounded-lg px-2 py-1.5 text-sm bg-white">
                    <option value="">— match invoice —</option>
                    {invoices.map((iv) => <option key={iv.id} value={iv.id}>{iv.number} · {money(iv.total)}{Math.abs(iv.total - Math.abs(t.amount)) < 0.01 ? ' ✓' : ''}</option>)}
                  </select>
                )}
                <button onClick={() => reconcile(t)} disabled={busy === t.id} className="ml-auto text-sm font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">{busy === t.id ? '…' : '✓ Reconcile'}</button>
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t border-zinc-50 flex items-center justify-between gap-2">
                <span className="text-sm text-zinc-600">{t.is_personal ? 'Personal / director loan' : t.category || 'Uncategorised'}{t.gst && !t.is_personal ? ' · incl GST' : ''}</span>
                <button onClick={() => undo(t)} disabled={busy === t.id} className="text-xs font-bold text-zinc-500 hover:text-zinc-800">Undo</button>
              </div>
            )}
          </div>
        ))}
        {txns.length === 0 && (
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-8 text-center text-zinc-500 text-sm">
            {tab === 'needs_review' ? '🎉 Nothing to review — all caught up! Import a CommBank file to bring in new transactions.' : 'Nothing reconciled yet.'}
          </div>
        )}
      </div>
    </div>
  )
}
