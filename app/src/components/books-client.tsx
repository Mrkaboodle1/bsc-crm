'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Trash2, Pencil, Download, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'

export type Tx = {
  id: string; date: string; direction: 'in' | 'out'; amount: number; gst: number
  category: string | null; description: string | null; party: string | null; source: string | null
}

const INCOME_CATS = ['Class fees', 'Holiday workshops', 'Kids Night Out', 'Memberships', 'Parties', 'Grants & donations', 'Merchandise', 'Stripe income', 'Other income']
const EXPENSE_CATS = ['Wages', 'Super', 'Rent', 'Insurance', 'Equipment', 'Supplies & craft', 'Marketing', 'Software & subscriptions', 'Utilities', 'Bank/Stripe fees', 'Travel', 'Other expense']

const money = (n: number) => `$${(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })

// Australian financial year + BAS quarter ranges.
function ranges() {
  const now = new Date()
  const y = now.getFullYear(); const m = now.getMonth() // 0-based
  const fyStartYear = m >= 6 ? y : y - 1
  const fyStart = `${fyStartYear}-07-01`; const fyEnd = `${fyStartYear + 1}-06-30`
  let qs: string, qe: string
  if (m >= 3 && m <= 5) { qs = `${y}-04-01`; qe = `${y}-06-30` }
  else if (m >= 6 && m <= 8) { qs = `${y}-07-01`; qe = `${y}-09-30` }
  else if (m >= 9 && m <= 11) { qs = `${y}-10-01`; qe = `${y}-12-31` }
  else { qs = `${y}-01-01`; qe = `${y}-03-31` }
  return { fyStart, fyEnd, qs, qe }
}

export function BooksClient({ initial }: { initial: Tx[] }) {
  const router = useRouter()
  const [rows, setRows] = useState<Tx[]>(initial)
  const [period, setPeriod] = useState<'quarter' | 'fy' | 'all'>('quarter')
  const [modal, setModal] = useState<{ dir: 'in' | 'out'; tx?: Tx } | null>(null)
  const [importing, setImporting] = useState(false)
  const r = ranges()

  const inRange = (d: string) => period === 'all' ? true : period === 'fy' ? (d >= r.fyStart && d <= r.fyEnd) : (d >= r.qs && d <= r.qe)
  const shown = useMemo(() => rows.filter((t) => inRange(t.date)), [rows, period]) // eslint-disable-line react-hooks/exhaustive-deps

  const moneyIn = shown.filter((t) => t.direction === 'in').reduce((s, t) => s + Number(t.amount), 0)
  const moneyOut = shown.filter((t) => t.direction === 'out').reduce((s, t) => s + Number(t.amount), 0)
  const gstIn = shown.filter((t) => t.direction === 'in').reduce((s, t) => s + Number(t.gst), 0)
  const gstOut = shown.filter((t) => t.direction === 'out').reduce((s, t) => s + Number(t.gst), 0)

  async function del(id: string) {
    if (!confirm('Delete this entry?')) return
    setRows((xs) => xs.filter((x) => x.id !== id))
    fetch(`/api/books/transactions?id=${id}`, { method: 'DELETE' }).catch(() => {})
  }
  async function importStripe() {
    setImporting(true)
    const res = await fetch('/api/books/import-stripe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days: 180 }) })
    const j = await res.json(); setImporting(false)
    if (j.ok) { alert(`Imported ${j.imported} payment${j.imported === 1 ? '' : 's'} from Stripe.`); router.refresh() }
    else alert(j.error || 'Could not import')
  }

  const periodLabel = period === 'quarter' ? 'this BAS quarter' : period === 'fy' ? 'this financial year' : 'all time'

  return (
    <div className="space-y-5">
      {/* period + actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex bg-zinc-100 rounded-full p-1 text-sm font-bold">
          {([['quarter', 'This quarter'], ['fy', 'This year'], ['all', 'All time']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setPeriod(k)} className={`px-4 py-2 rounded-full ${period === k ? 'bg-white shadow text-zinc-900' : 'text-zinc-500'}`}>{l}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={importStripe} disabled={importing} className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-3 py-2 rounded-lg hover:bg-zinc-50 disabled:opacity-50"><Download size={15} /> {importing ? 'Importing…' : 'Import from Stripe'}</button>
          <button onClick={() => setModal({ dir: 'out' })} className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-3 py-2 rounded-lg hover:bg-zinc-50"><Plus size={15} /> Expense</button>
          <button onClick={() => setModal({ dir: 'in' })} className="inline-flex items-center gap-2 bg-[#D72027] text-white font-bold text-sm px-4 py-2 rounded-lg hover:bg-[#A0151B]"><Plus size={15} /> Income</button>
        </div>
      </div>

      {/* summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={`Money in (${periodLabel})`} value={money(moneyIn)} cls="text-emerald-700" />
        <Stat label="Money out" value={money(moneyOut)} cls="text-red-600" />
        <Stat label="Net profit" value={money(moneyIn - moneyOut)} cls={moneyIn - moneyOut >= 0 ? 'text-zinc-900' : 'text-red-600'} />
        <Stat label="GST to set aside" value={money(Math.max(0, gstIn - gstOut))} cls="text-amber-700" sub={`collected ${money(gstIn)} − paid ${money(gstOut)}`} />
      </div>

      {/* transactions */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-100 text-[11px] font-extrabold uppercase tracking-wide text-zinc-500">Transactions ({shown.length})</div>
        {shown.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">Nothing here yet. Tap <strong>Import from Stripe</strong> to pull your income, or add an expense.</div>
        ) : (
          <ul className="divide-y divide-zinc-50">
            {shown.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-zinc-50/60">
                {t.direction === 'in' ? <ArrowDownCircle size={18} className="text-emerald-500 shrink-0" /> : <ArrowUpCircle size={18} className="text-red-500 shrink-0" />}
                <span className="text-zinc-400 text-xs w-16 shrink-0">{fmtDate(t.date)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-zinc-800 truncate">{t.party || t.description || t.category || '—'}</div>
                  <div className="text-[11px] text-zinc-400">{t.category || 'Uncategorised'}{t.gst ? ` · GST ${money(t.gst)}` : ''}</div>
                </div>
                <span className={`font-extrabold shrink-0 ${t.direction === 'in' ? 'text-emerald-700' : 'text-red-600'}`}>{t.direction === 'in' ? '+' : '−'}{money(t.amount)}</span>
                <button onClick={() => setModal({ dir: t.direction, tx: t })} className="p-1 text-zinc-300 hover:text-[#D72027]"><Pencil size={14} /></button>
                <button onClick={() => del(t.id)} className="p-1 text-zinc-300 hover:text-red-600"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-zinc-400">GST is estimated at 1/11 of GST-inclusive amounts — adjust any entry if it&apos;s GST-free. This is a bookkeeping tool, not lodged tax advice.</p>

      {modal && <TxModal dir={modal.dir} tx={modal.tx} onClose={() => setModal(null)} onSaved={(saved) => {
        setRows((xs) => modal.tx ? xs.map((x) => x.id === saved.id ? saved : x) : [saved, ...xs])
        setModal(null)
      }} />}
    </div>
  )
}

function Stat({ label, value, cls, sub }: { label: string; value: string; cls: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4">
      <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">{label}</div>
      <div className={`text-2xl font-extrabold mt-1 ${cls}`}>{value}</div>
      {sub && <div className="text-[10px] text-zinc-400 mt-1">{sub}</div>}
    </div>
  )
}

const inp = 'w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#D72027]'

function TxModal({ dir, tx, onClose, onSaved }: { dir: 'in' | 'out'; tx?: Tx; onClose: () => void; onSaved: (t: Tx) => void }) {
  const isEdit = !!tx
  const today = new Date().toISOString().slice(0, 10)
  const [f, setF] = useState({
    date: tx?.date ?? today, amount: tx ? String(tx.amount) : '', gst: tx ? String(tx.gst) : '',
    category: tx?.category ?? (dir === 'in' ? 'Class fees' : 'Rent'), party: tx?.party ?? '', description: tx?.description ?? '',
  })
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  const autoGst = () => set('gst', String(Math.round((Number(f.amount) / 11) * 100) / 100))
  const cats = dir === 'in' ? INCOME_CATS : EXPENSE_CATS

  async function save() {
    if (!f.amount) { setErr('Enter an amount'); return }
    setBusy(true); setErr('')
    const body = { id: tx?.id, direction: dir, date: f.date, amount: Number(f.amount), gst: Number(f.gst) || 0, category: f.category, party: f.party, description: f.description }
    const r = await fetch('/api/books/transactions', { method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json()
    if (!r.ok) { setErr(j.error || 'Could not save'); setBusy(false); return }
    onSaved({ id: isEdit ? tx!.id : j.id, date: f.date, direction: dir, amount: Number(f.amount), gst: Number(f.gst) || 0, category: f.category, description: f.description || null, party: f.party || null, source: tx?.source ?? 'manual' })
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-100"><h3 className="font-extrabold text-zinc-900">{isEdit ? 'Edit' : dir === 'in' ? 'Add income' : 'Add expense'}</h3><button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={20} /></button></div>
        <div className="p-5 space-y-3">
          <label className="block"><span className="text-xs font-semibold text-zinc-600">Date</span><input type="date" className={inp} value={f.date} onChange={(e) => set('date', e.target.value)} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-xs font-semibold text-zinc-600">Amount ($)</span><input type="number" inputMode="decimal" className={inp} value={f.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" autoFocus /></label>
            <label className="block"><span className="text-xs font-semibold text-zinc-600">GST ($) <button type="button" onClick={autoGst} className="text-[#D72027] font-bold">auto</button></span><input type="number" inputMode="decimal" className={inp} value={f.gst} onChange={(e) => set('gst', e.target.value)} placeholder="0.00" /></label>
          </div>
          <label className="block"><span className="text-xs font-semibold text-zinc-600">Category</span><select className={inp} value={f.category} onChange={(e) => set('category', e.target.value)}>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
          <label className="block"><span className="text-xs font-semibold text-zinc-600">{dir === 'in' ? 'Who paid' : 'Paid to'}</span><input className={inp} value={f.party} onChange={(e) => set('party', e.target.value)} placeholder={dir === 'in' ? 'e.g. Sarah Brennan' : 'e.g. Landlord, Kmart'} /></label>
          <label className="block"><span className="text-xs font-semibold text-zinc-600">Note (optional)</span><input className={inp} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="What was it for?" /></label>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button onClick={onClose} className="text-sm font-semibold text-zinc-500 px-3 py-2.5">Cancel</button>
            <button onClick={save} disabled={busy} className="bg-[#D72027] text-white font-extrabold text-sm px-6 py-3 rounded-xl disabled:opacity-50">{busy ? 'Saving…' : isEdit ? 'Save' : dir === 'in' ? 'Add income' : 'Add expense'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
