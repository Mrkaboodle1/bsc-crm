'use client'

import { useEffect, useMemo, useState } from 'react'
import { RepeatingInvoices } from '@/components/repeating-invoices-client'

const TABS = [['all', 'All'], ['draft', 'Draft'], ['awaiting', 'Awaiting payment'], ['paid', 'Paid'], ['repeating', 'Repeating']] as const
type Tab = (typeof TABS)[number][0]

type Line = { description: string; account: string; qty: number; unit_price: number; gst: boolean }
type Invoice = {
  id: string
  number: string
  contact_name: string | null
  contact_email: string | null
  reference: string | null
  amounts_are: string
  issue_date: string
  due_date: string | null
  notes: string | null
  status: 'draft' | 'awaiting' | 'sent' | 'paid' | 'void'
  subtotal: number
  gst: number
  total: number
  lines: { description: string; account: string | null; qty: number; unit_price: number; gst: boolean }[]
}

// BigStar income categories (the sales side of the chart of accounts).
const ACCOUNTS = [
  'Term class fees', 'Holiday workshops', 'Private lessons', 'Birthday parties', 'Incursions',
  'Events', 'Mr Kaboodle Entertainment', 'Merchandise', 'Grants', 'Donations', 'Other income',
]

const money = (n: number) => '$' + (Number(n) || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const todayISO = () => new Date().toISOString().slice(0, 10)
const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const blankLine = (): Line => ({ description: '', account: '', qty: 1, unit_price: 0, gst: true })

const STATUS: Record<Invoice['status'], { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-zinc-100 text-zinc-600' },
  awaiting: { label: 'Awaiting payment', cls: 'bg-amber-100 text-amber-700' },
  sent: { label: 'Sent', cls: 'bg-sky-100 text-sky-700' },
  paid: { label: 'Paid', cls: 'bg-emerald-100 text-emerald-700' },
  void: { label: 'Void', cls: 'bg-rose-100 text-rose-600 line-through' },
}

export function InvoicesClient() {
  const [rows, setRows] = useState<Invoice[] | null>(null)
  const [missing, setMissing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  async function bulkDelete() {
    if (!selected.size) return
    if (!confirm(`Delete ${selected.size} invoice${selected.size > 1 ? 's' : ''}? Paid invoices are protected and will be skipped. This cannot be undone.`)) return
    setBulkBusy(true)
    try {
      const r = await fetch(`/api/finance/invoices?ids=${[...selected].join(',')}`, { method: 'DELETE' })
      const j = await r.json()
      if (!r.ok) { alert(j.error || 'Could not delete'); return }
      if (j.skippedPaid) alert(`${j.deleted} deleted. ${j.skippedPaid} skipped because they're already paid.`)
      setSelected(new Set())
      load()
    } finally { setBulkBusy(false) }
  }
  const [err, setErr] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('all')
  const [sendModal, setSendModal] = useState<{ id: string; to: string; number: string; subject: string; message: string } | null>(null)
  const [sendBusy, setSendBusy] = useState(false)

  // Form state (Xero-style header + lines)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [issue, setIssue] = useState(todayISO())
  const [due, setDue] = useState('')
  const [ref, setRef] = useState('')
  const [amtMode, setAmtMode] = useState<'exclusive' | 'inclusive' | 'none'>('exclusive')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([blankLine()])

  async function load() {
    const r = await fetch('/api/finance/invoices').then((x) => x.json()).catch(() => null)
    if (r?.missing) { setMissing(true); setRows([]); return }
    if (r?.ok) setRows(r.rows)
  }
  useEffect(() => { load() }, [])

  function resetForm() {
    setEditId(null); setName(''); setEmail(''); setIssue(todayISO()); setDue(''); setRef('')
    setAmtMode('exclusive'); setNotes(''); setLines([blankLine()]); setShowForm(false)
  }

  function startEdit(inv: Invoice) {
    setEditId(inv.id)
    setName(inv.contact_name || ''); setEmail(inv.contact_email || '')
    setIssue(inv.issue_date); setDue(inv.due_date || ''); setRef(inv.reference || '')
    setAmtMode((inv.amounts_are as 'exclusive' | 'inclusive' | 'none') || 'exclusive')
    setNotes(inv.notes || '')
    setLines(inv.lines.length ? inv.lines.map((l) => ({ description: l.description || '', account: l.account || '', qty: Number(l.qty) || 1, unit_price: Number(l.unit_price) || 0, gst: l.gst !== false })) : [blankLine()])
    setShowForm(true)
    setErr(null)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function setLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  const totals = useMemo(() => {
    const sumAmt = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unit_price) || 0), 0)
    if (amtMode === 'none') return { subtotal: sumAmt, gst: 0, total: sumAmt }
    if (amtMode === 'inclusive') {
      const gst = lines.reduce((s, l) => s + (l.gst ? (Number(l.qty) || 0) * (Number(l.unit_price) || 0) / 11 : 0), 0)
      return { subtotal: sumAmt - gst, gst, total: sumAmt }
    }
    const gst = lines.reduce((s, l) => s + (l.gst ? (Number(l.qty) || 0) * (Number(l.unit_price) || 0) * 0.1 : 0), 0)
    return { subtotal: sumAmt, gst, total: sumAmt + gst }
  }, [lines, amtMode])

  function openEmail(id: string, to: string, number: string, contactName: string) {
    setErr(null)
    const first = (contactName || '').split(' ')[0] || 'there'
    setSendModal({
      id, to, number,
      subject: `Invoice ${number} from Big Star Circus`,
      message: `Hi ${first},\n\nPlease find attached your invoice${number ? ` ${number}` : ''}. Thank you for supporting Big Star Circus!`,
    })
  }
  async function sendEmailNow() {
    if (!sendModal) return
    if (!sendModal.to) { setErr('This invoice has no customer email — add one first.'); setSendModal(null); return }
    setSendBusy(true)
    const r = await fetch('/api/finance/invoices', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sendModal.id, action: 'send', subject: sendModal.subject, message: sendModal.message }) }).then((x) => x.json()).catch(() => null)
    setSendBusy(false)
    if (!r?.ok) { setErr(r?.error || 'Could not send.'); return }
    setSendModal(null); load()
  }

  async function submit(mode: 'draft' | 'approve' | 'send') {
    setErr(null); setBusy(mode)
    const payload = { contact_name: name, contact_email: email, issue_date: issue || todayISO(), due_date: due || null, reference: ref, amounts_are: amtMode, notes, lines }
    let id = editId
    let number = editId ? (rows?.find((r) => r.id === editId)?.number || '') : ''
    if (editId) {
      const r = await fetch('/api/finance/invoices', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editId, action: 'update', ...payload }) }).then((x) => x.json()).catch(() => null)
      if (!r?.ok) { setBusy(null); setErr(r?.error || 'Could not save changes.'); return }
    } else {
      const r = await fetch('/api/finance/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then((x) => x.json()).catch(() => null)
      if (!r?.ok) { setBusy(null); setErr(r?.error || 'Could not create the invoice.'); return }
      id = r.id; number = r.number || ''
    }
    // Approve (draft → awaiting) for both Approve and Approve & Send.
    if (id && (mode === 'approve' || mode === 'send')) {
      await fetch('/api/finance/invoices', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'approve' }) }).catch(() => null)
    }
    const captured = { id: id as string, number, to: email, name }
    setBusy(null); resetForm(); load()
    // "Approve & send" opens the editable email so you can tweak it before it goes.
    if (mode === 'send' && captured.id) openEmail(captured.id, captured.to, captured.number, captured.name)
  }

  async function act(id: string, action: 'send' | 'paid' | 'void' | 'approve') {
    if (action === 'void' && !confirm('Void this invoice? It stays on record but is marked cancelled.')) return
    setErr(null); setBusy(id + action)
    const r = await fetch('/api/finance/invoices', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) }).then((x) => x.json()).catch(() => null)
    setBusy(null)
    if (!r?.ok) { setErr(r?.error || 'That didn’t work.'); return }
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this draft invoice?')) return
    setBusy(id + 'del'); await fetch('/api/finance/invoices?id=' + id, { method: 'DELETE' }); setBusy(null); load()
  }

  // Import invoices from a Xero "SalesInvoiceTemplate.csv" file.
  async function importXero(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    const text = await f.text(); e.target.value = ''
    setErr(null); setBusy('importcsv')
    const r = await fetch('/api/finance/invoices/import-xero-csv', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv: text }) }).then((x) => x.json()).catch(() => null)
    setBusy(null)
    if (!r?.ok) { setErr(r?.error === 'missing-table' ? 'Invoicing tables not set up yet.' : (r?.error || 'Import failed.')); return }
    alert(`Imported ${r.imported} invoice${r.imported === 1 ? '' : 's'}${r.skipped ? `, skipped ${r.skipped} already there` : ''}. They're in your Draft tab.`)
    setTab('draft'); load()
  }

  // Export all invoices in Xero's CSV format (re-importable into Xero).
  function exportXero() {
    const cell = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
    const dmy = (iso: string) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
    const header = '*ContactName,EmailAddress,POAddressLine1,POAddressLine2,POAddressLine3,POAddressLine4,POCity,PORegion,POPostalCode,POCountry,*InvoiceNumber,Reference,*InvoiceDate,*DueDate,InventoryItemCode,*Description,*Quantity,*UnitAmount,Discount,*AccountCode,*TaxType,TrackingName1,TrackingOption1,TrackingName2,TrackingOption2,Currency,BrandingTheme'
    const out = [header]
    for (const inv of rows ?? []) {
      for (const l of inv.lines ?? []) {
        const taxType = l.gst !== false ? 'GST on Income' : 'GST Free Income'
        const cols = [inv.contact_name || '', inv.contact_email || '', '', '', '', '', '', '', '', '', inv.number || '', inv.reference || '', dmy(inv.issue_date), dmy(inv.due_date || ''), '', l.description || '', l.qty ?? 1, l.unit_price ?? 0, '', l.account || '', taxType, '', '', '', '', 'AUD', '']
        out.push(cols.map(cell).join(','))
      }
    }
    const blob = new Blob([out.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'BigStarBooks-invoices-xero.csv'; a.click(); URL.revokeObjectURL(a.href)
  }

  const counts = useMemo<Record<string, number>>(() => {
    const r = rows ?? []
    return {
      all: r.length,
      draft: r.filter((i) => i.status === 'draft').length,
      awaiting: r.filter((i) => i.status === 'awaiting' || i.status === 'sent').length,
      paid: r.filter((i) => i.status === 'paid').length,
    }
  }, [rows])
  const filtered = (rows ?? []).filter((i) => (tab === 'all' ? true : tab === 'awaiting' ? i.status === 'awaiting' || i.status === 'sent' : i.status === tab))

  if (missing) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
        Invoicing needs a small database update. Paste migration <strong>047_bigstar_books_invoices_xero.sql</strong> into Supabase, then refresh this page.
      </div>
    )
  }

  const inputCls = 'mt-1 w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#D72027]'

  return (
    <div className="space-y-5">
      {/* Editable email before sending — Xero-style */}
      {sendModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSendModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-zinc-900">Send invoice {sendModal.number}</h3>
            <div className="text-sm"><span className="text-xs text-zinc-500">To</span><div className="border border-zinc-200 rounded-lg px-3 py-2 bg-zinc-50 text-zinc-700">{sendModal.to || 'No email on this invoice — edit the invoice and add one.'}</div></div>
            <label className="text-sm block"><span className="text-xs text-zinc-500">Subject</span>
              <input value={sendModal.subject} onChange={(e) => setSendModal({ ...sendModal, subject: e.target.value })} className="mt-1 w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm" /></label>
            <label className="text-sm block"><span className="text-xs text-zinc-500">Message (edit this however you like)</span>
              <textarea value={sendModal.message} onChange={(e) => setSendModal({ ...sendModal, message: e.target.value })} rows={6} className="mt-1 w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm resize-y" /></label>
            <p className="text-xs text-zinc-400">Your signature and the invoice PDF are attached automatically.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSendModal(null)} className="text-sm px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold">Cancel</button>
              <button onClick={sendEmailNow} disabled={sendBusy || !sendModal.to} className="text-sm px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50">{sendBusy ? 'Sending…' : '✉ Send now'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs — like Xero */}
      <div className="flex gap-1 border-b border-zinc-200 overflow-x-auto">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 text-sm font-bold whitespace-nowrap border-b-2 ${tab === key ? 'border-[#D72027] text-[#D72027]' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
          >
            {label}{key !== 'repeating' && counts[key] != null ? ` (${counts[key]})` : ''}
          </button>
        ))}
      </div>

      {tab === 'repeating' && <RepeatingInvoices />}

      {tab !== 'repeating' && (
        <>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm text-zinc-500">{rows ? `${filtered.length} invoice${filtered.length === 1 ? '' : 's'}` : 'Loading…'}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-sm font-bold px-3 py-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 cursor-pointer" title="Import a Xero invoice CSV">
                {busy === 'importcsv' ? 'Importing…' : '⬆ Import (Xero CSV)'}
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={importXero} disabled={busy === 'importcsv'} />
              </label>
              <button onClick={exportXero} className="text-sm font-bold px-3 py-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700" title="Export all invoices as a Xero CSV">⬇ Export</button>
              <button onClick={() => (showForm ? resetForm() : setShowForm(true))} className="bg-[#D72027] hover:bg-[#A0151B] text-white text-sm font-bold rounded-xl px-4 py-2">
                {showForm ? 'Close' : '+ New invoice'}
              </button>
            </div>
          </div>

      {err && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{err}</div>}

      {showForm && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-zinc-900">{editId ? 'Edit invoice' : 'New invoice'}</h3>

          {/* Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm"><span className="text-xs text-zinc-500">To (customer name)</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Paradise Resort" /></label>
            <label className="text-sm"><span className="text-xs text-zinc-500">Customer email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="name@email.com" /></label>
            <label className="text-sm"><span className="text-xs text-zinc-500">Issue date</span>
              <input type="date" value={issue} onChange={(e) => setIssue(e.target.value)} className={inputCls} /></label>
            <label className="text-sm"><span className="text-xs text-zinc-500">Due date</span>
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={inputCls} /></label>
          </div>

          {/* Quick terms + reference + GST mode */}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <div className="text-xs text-zinc-500 mb-1">Quick due date</div>
              <div className="flex gap-1">
                {[['On receipt', 0], ['7 days', 7], ['14 days', 14], ['30 days', 30]].map(([label, d]) => (
                  <button key={label as string} type="button" onClick={() => setDue(addDays(issue || todayISO(), d as number))}
                    className="text-[11px] font-bold px-2 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700">{label as string}</button>
                ))}
              </div>
            </div>
            <label className="text-sm flex-1 min-w-[140px]"><span className="text-xs text-zinc-500">Reference (optional)</span>
              <input value={ref} onChange={(e) => setRef(e.target.value)} className={inputCls} placeholder="e.g. PO number / booking" /></label>
            <label className="text-sm"><span className="text-xs text-zinc-500">Amounts are</span>
              <select value={amtMode} onChange={(e) => setAmtMode(e.target.value as 'exclusive' | 'inclusive' | 'none')} className={inputCls}>
                <option value="exclusive">GST exclusive</option>
                <option value="inclusive">GST inclusive</option>
                <option value="none">No GST</option>
              </select></label>
          </div>

          {/* Lines */}
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="border border-zinc-200 rounded-xl p-4 space-y-3 bg-white">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Description</label>
                  <textarea value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} rows={3} className="mt-1 w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm resize-y leading-relaxed" placeholder="What's this for? Write as many lines as you like — e.g. client name, NDIS number, plan dates, service code…" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 items-end">
                  <div className="col-span-2 sm:col-span-5">
                    <label className="text-xs text-zinc-500">Category</label>
                    <select value={l.account} onChange={(e) => setLine(i, { account: e.target.value })} className="mt-1 w-full border border-zinc-200 rounded-lg px-2 py-2 text-sm bg-white">
                      <option value="">— category —</option>
                      {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-zinc-500">Qty</label>
                    <input type="number" value={l.qty} onChange={(e) => setLine(i, { qty: parseFloat(e.target.value) })} className="mt-1 w-full border border-zinc-200 rounded-lg px-2 py-2 text-sm text-right" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-zinc-500">Unit price</label>
                    <input type="number" value={l.unit_price} onChange={(e) => setLine(i, { unit_price: parseFloat(e.target.value) })} className="mt-1 w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-right" />
                  </div>
                  <div className="sm:col-span-1 flex flex-col items-center">
                    <label className="text-xs text-zinc-500">GST</label>
                    <input type="checkbox" checked={amtMode !== 'none' && l.gst} disabled={amtMode === 'none'} onChange={(e) => setLine(i, { gst: e.target.checked })} className="mt-2 w-5 h-5 accent-[#D72027] disabled:opacity-40" aria-label="Apply GST" />
                  </div>
                  <div className="sm:col-span-2 text-right">
                    <label className="text-xs text-zinc-500 block">Amount</label>
                    <div className="mt-1 flex items-center justify-end gap-2">
                      <span className="text-sm tabular-nums font-semibold text-zinc-800">{money((Number(l.qty) || 0) * (Number(l.unit_price) || 0))}</span>
                      <button onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="text-zinc-400 hover:text-rose-600 text-xl leading-none" aria-label="Remove line">×</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => setLines((ls) => [...ls, blankLine()])} className="text-sm text-[#D72027] font-bold">+ Add line</button>
          </div>

          <label className="text-sm block"><span className="text-xs text-zinc-500">Notes (shown on the invoice, optional)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} placeholder="Bank details, thank-you note, etc." /></label>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="text-sm text-right space-y-0.5">
              <div className="text-zinc-500">Subtotal: <span className="tabular-nums text-zinc-800">{money(totals.subtotal)}</span></div>
              <div className="text-zinc-500">GST: <span className="tabular-nums text-zinc-800">{money(totals.gst)}</span></div>
              <div className="font-bold text-zinc-900 text-base">Total: <span className="tabular-nums">{money(totals.total)}</span></div>
            </div>
          </div>

          {/* Actions — Xero-style */}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button onClick={resetForm} className="text-sm px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold">Cancel</button>
            <button onClick={() => submit('draft')} disabled={!!busy} className="text-sm px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold disabled:opacity-50">
              {busy === 'draft' ? 'Saving…' : 'Save as draft'}
            </button>
            <button onClick={() => submit('approve')} disabled={!!busy} className="text-sm px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold disabled:opacity-50">
              {busy === 'approve' ? 'Saving…' : 'Approve'}
            </button>
            <button onClick={() => submit('send')} disabled={!!busy} className="text-sm px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50">
              {busy === 'send' ? 'Sending…' : 'Approve & send'}
            </button>
          </div>
        </div>
      )}

      {/* Bulk-select action bar */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 bg-red-600 text-white rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-lg">
          <span className="text-sm font-bold">{selected.size} selected</span>
          <button onClick={bulkDelete} disabled={bulkBusy} className="text-xs font-bold bg-white text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50">{bulkBusy ? 'Deleting…' : `🗑 Delete ${selected.size}`}</button>
          <button onClick={() => setSelected(new Set(filtered.filter((i) => i.status !== 'paid').map((i) => i.id)))} className="text-xs font-semibold underline">select all on this tab</button>
          <button onClick={() => setSelected(new Set())} className="text-xs font-semibold underline ml-auto">clear</button>
        </div>
      )}

      {/* Invoice list */}
      <div className="space-y-2">
        {filtered.map((inv) => (
          <div key={inv.id} className={`bg-white border rounded-2xl p-4 ${selected.has(inv.id) ? 'border-red-400 ring-2 ring-red-100' : 'border-zinc-200'}`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-2.5">
                {inv.status !== 'paid' && (
                  <input
                    type="checkbox"
                    checked={selected.has(inv.id)}
                    onChange={(e) => { const s = new Set(selected); if (e.target.checked) s.add(inv.id); else s.delete(inv.id); setSelected(s) }}
                    className="mt-1 w-4 h-4 accent-[#D72027] cursor-pointer"
                    title="Select for batch actions"
                  />
                )}
                <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-900">{inv.number}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS[inv.status].cls}`}>{STATUS[inv.status].label}</span>
                </div>
                <div className="text-sm text-zinc-600 mt-0.5">{inv.contact_name || 'No customer name'}{inv.contact_email ? ` · ${inv.contact_email}` : ''}</div>
                <div className="text-xs text-zinc-400 mt-0.5">Issued {inv.issue_date}{inv.due_date ? ` · due ${inv.due_date}` : ''}{inv.reference ? ` · ref ${inv.reference}` : ''}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold tabular-nums text-zinc-900">{money(inv.total)}</div>
                <div className="text-[10px] text-zinc-400">inc. {money(inv.gst)} GST</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-50 flex items-center gap-2 flex-wrap">
              {inv.status === 'draft' && (
                <>
                  <button onClick={() => startEdit(inv)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700">✎ Edit</button>
                  <button onClick={() => act(inv.id, 'approve')} disabled={busy === inv.id + 'approve'} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50">Approve</button>
                </>
              )}
              {inv.status !== 'paid' && inv.status !== 'void' && (
                <button onClick={() => openEmail(inv.id, inv.contact_email || '', inv.number, inv.contact_name || '')} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white">
                  {inv.status === 'sent' ? '✉ Resend' : '✉ Send'}
                </button>
              )}
              {inv.status !== 'paid' && inv.status !== 'void' && (
                <button onClick={() => act(inv.id, 'paid')} disabled={busy === inv.id + 'paid'} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">✓ Mark paid</button>
              )}
              {inv.status === 'draft' && (
                <button onClick={() => remove(inv.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600">Delete</button>
              )}
              {inv.status !== 'paid' && inv.status !== 'void' && (
                <button onClick={() => act(inv.id, 'void')} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600">Void</button>
              )}
            </div>
          </div>
        ))}
        {rows && filtered.length === 0 && !showForm && (
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-8 text-center text-zinc-500 text-sm">
            {tab === 'all' ? 'No invoices yet. Tap ' : `Nothing in ${tab === 'awaiting' ? 'Awaiting payment' : tab}. Tap `}<strong>+ New invoice</strong> to make one.
          </div>
        )}
      </div>
        </>
      )}
    </div>
  )
}
