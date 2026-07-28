'use client'

import { useEffect, useMemo, useState } from 'react'

type Line = { description: string; account: string; qty: number; unit_price: number; gst: boolean }
type Repeating = {
  id: string
  contact_name: string | null
  contact_email: string | null
  reference: string | null
  amounts_are: string
  lines: Line[]
  frequency: 'weekly' | 'fortnightly' | 'monthly'
  due_days: number
  next_date: string
  end_date: string | null
  mode: 'draft' | 'approve' | 'send'
  active: boolean
}

const ACCOUNTS = [
  'Term class fees', 'Holiday workshops', 'Private lessons', 'Birthday parties', 'Incursions',
  'Events', 'Mr Kaboodle Entertainment', 'Merchandise', 'Grants', 'Donations', 'Other income',
]
const money = (n: number) => '$' + (Number(n) || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const todayISO = () => new Date().toISOString().slice(0, 10)
const blankLine = (): Line => ({ description: '', account: '', qty: 1, unit_price: 0, gst: true })
const FREQ_LABEL: Record<string, string> = { weekly: 'Every 1 week', fortnightly: 'Every 2 weeks', monthly: 'Every month' }
const MODE_LABEL: Record<string, string> = { draft: 'Saved as draft', approve: 'Approved', send: 'Approved & sent' }

function lineTotal(lines: Line[], mode: string) {
  const sum = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unit_price) || 0), 0)
  if (mode === 'inclusive' || mode === 'none') return sum
  const gst = lines.reduce((s, l) => s + (l.gst ? (Number(l.qty) || 0) * (Number(l.unit_price) || 0) * 0.1 : 0), 0)
  return sum + gst
}

export function RepeatingInvoices() {
  const [rows, setRows] = useState<Repeating[] | null>(null)
  const [missing, setMissing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [ref, setRef] = useState('')
  const [amtMode, setAmtMode] = useState<'exclusive' | 'inclusive' | 'none'>('exclusive')
  const [lines, setLines] = useState<Line[]>([blankLine()])
  const [frequency, setFrequency] = useState<'weekly' | 'fortnightly' | 'monthly'>('weekly')
  const [dueDays, setDueDays] = useState(7)
  const [nextDate, setNextDate] = useState(todayISO())
  const [endDate, setEndDate] = useState('')
  const [mode, setMode] = useState<'draft' | 'approve' | 'send'>('approve')

  async function load() {
    const r = await fetch('/api/finance/repeating').then((x) => x.json()).catch(() => null)
    if (r?.missing) { setMissing(true); setRows([]); return }
    if (r?.ok) setRows(r.rows)
  }
  useEffect(() => { load() }, [])

  function reset() {
    setEditId(null); setName(''); setEmail(''); setRef(''); setAmtMode('exclusive'); setLines([blankLine()])
    setFrequency('weekly'); setDueDays(7); setNextDate(todayISO()); setEndDate(''); setMode('approve'); setShowForm(false); setErr(null)
  }
  function startEdit(t: Repeating) {
    setEditId(t.id); setName(t.contact_name || ''); setEmail(t.contact_email || ''); setRef(t.reference || '')
    setAmtMode((t.amounts_are as 'exclusive' | 'inclusive' | 'none') || 'exclusive')
    setLines(t.lines?.length ? t.lines.map((l) => ({ description: l.description || '', account: l.account || '', qty: Number(l.qty) || 1, unit_price: Number(l.unit_price) || 0, gst: l.gst !== false })) : [blankLine()])
    setFrequency(t.frequency); setDueDays(t.due_days ?? 7); setNextDate(t.next_date); setEndDate(t.end_date || ''); setMode(t.mode)
    setShowForm(true); setErr(null)
  }
  function setLine(i: number, patch: Partial<Line>) { setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l))) }

  const total = useMemo(() => lineTotal(lines, amtMode), [lines, amtMode])

  async function save() {
    setErr(null); setBusy(true)
    const payload = { contact_name: name, contact_email: email, reference: ref, amounts_are: amtMode, lines, frequency, due_days: dueDays, next_date: nextDate, end_date: endDate || null, mode }
    const r = editId
      ? await fetch('/api/finance/repeating', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editId, ...payload }) }).then((x) => x.json()).catch(() => null)
      : await fetch('/api/finance/repeating', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then((x) => x.json()).catch(() => null)
    setBusy(false)
    if (!r?.ok) { setErr(r?.error || 'Could not save the repeating invoice.'); return }
    reset(); load()
  }
  async function toggleActive(t: Repeating) {
    await fetch('/api/finance/repeating', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, active: !t.active }) })
    load()
  }
  async function remove(id: string) {
    if (!confirm('Delete this repeating invoice? It will stop creating new invoices.')) return
    await fetch('/api/finance/repeating?id=' + id, { method: 'DELETE' }); load()
  }

  if (missing) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
        Repeating invoices need their database table. Paste migration <strong>048_bigstar_books_repeating.sql</strong> into Supabase, then refresh.
      </div>
    )
  }

  const inputCls = 'mt-1 w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#D72027]'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">These create a new invoice automatically on a schedule — perfect for your weekly NDIS billing.</p>
        <button onClick={() => (showForm ? reset() : setShowForm(true))} className="bg-[#D72027] hover:bg-[#A0151B] text-white text-sm font-bold rounded-xl px-4 py-2 shrink-0">
          {showForm ? 'Close' : '+ New repeating invoice'}
        </button>
      </div>

      {err && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{err}</div>}

      {showForm && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-zinc-900">{editId ? 'Edit repeating invoice' : 'New repeating invoice'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm"><span className="text-xs text-zinc-500">Customer name</span><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Plan Partners" /></label>
            <label className="text-sm"><span className="text-xs text-zinc-500">Customer email</span><input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="name@email.com" /></label>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="text-sm"><span className="text-xs text-zinc-500">Repeats</span>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value as 'weekly' | 'fortnightly' | 'monthly')} className={inputCls}>
                <option value="weekly">Every 1 week</option><option value="fortnightly">Every 2 weeks</option><option value="monthly">Every month</option>
              </select></label>
            <label className="text-sm"><span className="text-xs text-zinc-500">First invoice date</span><input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className={inputCls} /></label>
            <label className="text-sm"><span className="text-xs text-zinc-500">Due (days after)</span><input type="number" value={dueDays} onChange={(e) => setDueDays(parseInt(e.target.value) || 0)} className={inputCls} /></label>
            <label className="text-sm"><span className="text-xs text-zinc-500">End date (optional)</span><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} /></label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-sm"><span className="text-xs text-zinc-500">Reference (optional)</span><input value={ref} onChange={(e) => setRef(e.target.value)} className={inputCls} placeholder="e.g. NDIS number" /></label>
            <label className="text-sm"><span className="text-xs text-zinc-500">Amounts are</span>
              <select value={amtMode} onChange={(e) => setAmtMode(e.target.value as 'exclusive' | 'inclusive' | 'none')} className={inputCls}>
                <option value="exclusive">GST exclusive</option><option value="inclusive">GST inclusive</option><option value="none">No GST</option>
              </select></label>
            <label className="text-sm"><span className="text-xs text-zinc-500">Each invoice will be</span>
              <select value={mode} onChange={(e) => setMode(e.target.value as 'draft' | 'approve' | 'send')} className={inputCls}>
                <option value="draft">Saved as draft</option><option value="approve">Approved (awaiting payment)</option><option value="send">Approved &amp; emailed</option>
              </select></label>
          </div>

          {/* Lines */}
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="border border-zinc-200 rounded-xl p-4 space-y-3 bg-white">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Description</label>
                  <textarea value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} rows={3} className="mt-1 w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm resize-y leading-relaxed" placeholder="What's this for? Write as many lines as you like — e.g. client name, NDIS number, service code…" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 items-end">
                  <div className="col-span-2 sm:col-span-5">
                    <label className="text-xs text-zinc-500">Category</label>
                    <select value={l.account} onChange={(e) => setLine(i, { account: e.target.value })} className="mt-1 w-full border border-zinc-200 rounded-lg px-2 py-2 text-sm bg-white">
                      <option value="">— category —</option>{ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
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

          <div className="flex items-center justify-between">
            <div className="text-xs text-zinc-500">Each invoice ≈ <span className="font-bold text-zinc-800">{money(total)}</span></div>
            <div className="flex gap-2">
              <button onClick={reset} className="text-sm px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold">Cancel</button>
              <button onClick={save} disabled={busy} className="text-sm px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50">{busy ? 'Saving…' : editId ? 'Save changes' : 'Save repeating invoice'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-3 py-2.5 font-medium">Reference</th>
                <th className="px-3 py-2.5 font-medium text-right">Amount</th>
                <th className="px-3 py-2.5 font-medium">Repeats</th>
                <th className="px-3 py-2.5 font-medium">Next invoice</th>
                <th className="px-3 py-2.5 font-medium">Each will be</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((t) => (
                <tr key={t.id} className={`border-b border-zinc-50 ${!t.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-zinc-800">{t.contact_name || t.contact_email || 'Unnamed'}</td>
                  <td className="px-3 py-3 text-zinc-500">{t.reference || '—'}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-700">{money(lineTotal(t.lines || [], t.amounts_are))}</td>
                  <td className="px-3 py-3 text-zinc-600">{FREQ_LABEL[t.frequency]}</td>
                  <td className="px-3 py-3 text-zinc-600">{t.active ? t.next_date : 'Paused'}{t.end_date ? ` · ends ${t.end_date}` : ''}</td>
                  <td className="px-3 py-3 text-zinc-600">{MODE_LABEL[t.mode]}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(t)} className="text-xs font-bold text-zinc-600 hover:text-zinc-900 mr-2">Edit</button>
                    <button onClick={() => toggleActive(t)} className="text-xs font-bold text-amber-600 hover:text-amber-800 mr-2">{t.active ? 'Pause' : 'Resume'}</button>
                    <button onClick={() => remove(t.id)} className="text-xs font-bold text-rose-500 hover:text-rose-700">Delete</button>
                  </td>
                </tr>
              ))}
              {rows && rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-400 text-sm">No repeating invoices yet. Tap <strong>+ New repeating invoice</strong> to set one up.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
