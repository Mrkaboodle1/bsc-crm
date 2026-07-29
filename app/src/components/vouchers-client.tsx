'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Check, Copy, Ticket, TrendingUp, AlertTriangle, ArrowUpRight, Pencil, FileText } from 'lucide-react'
import { termFor } from '@/lib/qld-terms'

export type Voucher = {
  id: string
  family_id: string | null
  family_name: string | null
  student_name: string | null
  voucher_ref: string | null
  amount: number
  weekly_value: number
  weeks: number
  redeemed_on: string | null
  term_start: string | null
  term_end: string | null
  status: 'active' | 'converted' | 'expired'
  notes: string | null
  use_type: 'term' | 'workshop' | 'both' | 'unused' | null
  photo_url: string | null
}

const USE_LABEL: Record<string, string> = { term: '📚 Term classes', workshop: '🎪 Holiday workshop', both: '📚🎪 Both', unused: '⏳ Not used yet' }

const fmt = (d: string | null) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const daysTo = (d: string | null) => d ? Math.round((new Date(d + 'T00:00:00').getTime() - Date.now()) / 86400000) : null
const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const STATUS_CHIP: Record<string, string> = { active: 'bg-emerald-100 text-emerald-700', converted: 'bg-blue-100 text-blue-700', expired: 'bg-zinc-100 text-zinc-500' }

const isPdf = (url: string) => /\.pdf($|\?)/i.test(url)

export function VouchersClient({ initial, setupNeeded, setupSql }: { initial: Voucher[]; setupNeeded: boolean; setupSql: string }) {
  const router = useRouter()
  const [items, setItems] = useState<Voucher[]>(initial)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ family_name: '', student_name: '', voucher_ref: '', redeemed_on: '', use_type: 'term' as Voucher['use_type'], photo_url: '', amount: '200' })
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [parsedNote, setParsedNote] = useState('')
  const [queue, setQueue] = useState<{ form: Partial<{ family_name: string; student_name: string; voucher_ref: string; redeemed_on: string; use_type: Voucher['use_type']; photo_url: string; amount: string }>; note: string }[]>([])

  if (setupNeeded) return <SetupCard sql={setupSql} />

  const active = items.filter((v) => v.status === 'active')
  const converted = items.filter((v) => v.status === 'converted')
  const funded = items.reduce((s, v) => s + Number(v.amount || 0), 0)
  const endingSoon = active.filter((v) => { const d = daysTo(v.term_end); return d !== null && d <= 14 })
  const convRate = items.length ? Math.round((converted.length / items.length) * 100) : 0

  async function uploadPhoto(file: File) {
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const r = await fetch('/api/upload', { method: 'POST', body: fd })
      const j = await r.json()
      if (j.url) setForm((f) => ({ ...f, photo_url: j.url }))
      else alert(j.error || 'Could not upload photo')
    } finally { setUploading(false) }
  }
  function resetForm() {
    setForm({ family_name: '', student_name: '', voucher_ref: '', redeemed_on: '', use_type: 'term', photo_url: '', amount: '200' })
    setEditingId(null); setAdding(false); setParsedNote(''); setQueue([])
  }
  function startEdit(v: Voucher) {
    setForm({ family_name: v.family_name || '', student_name: v.student_name || '', voucher_ref: v.voucher_ref || '', redeemed_on: v.redeemed_on || '', use_type: v.use_type ?? 'term', photo_url: v.photo_url || '', amount: String(v.amount ?? 200) })
    setEditingId(v.id); setAdding(true)
  }
  type Parsed = { form: Partial<typeof form>; note: string }

  function toParsed(j: { fields?: Record<string, unknown>; photo_url?: string; family_match?: { family_name: string; primary_parent: string }; warning?: string }): Parsed {
    const f = (j.fields || {}) as Record<string, string | number | null>
    const bits = [
      f.voucher_ref ? `voucher ${f.voucher_ref}` : null,
      f.child_name ? `child ${f.child_name}` : null,
      f.child_dob ? `DOB ${f.child_dob}` : null,
      f.parent_name ? `parent ${f.parent_name}` : null,
      j.family_match ? `✓ matched to existing family "${j.family_match.family_name}"` : '— no existing family matched, check the name',
    ].filter(Boolean).join(' · ')
    return {
      form: {
        voucher_ref: (f.voucher_ref as string) || '',
        student_name: (f.child_name as string) || '',
        family_name: j.family_match?.primary_parent || (f.parent_name as string) || '',
        redeemed_on: new Date().toISOString().slice(0, 10),
        amount: f.amount ? String(f.amount) : '200',
        photo_url: j.photo_url || '',
      },
      note: (j.warning ? j.warning + ' · ' : '') + 'Read from PDF: ' + bits + '. Check it, then Save.',
    }
  }

  function loadParsed(p: Parsed, remaining: number) {
    setForm((prev) => ({ ...prev, use_type: prev.use_type, ...p.form }) as typeof form)
    setParsedNote(p.note + (remaining > 0 ? ` (${remaining} more voucher${remaining > 1 ? 's' : ''} queued after this one)` : ''))
  }

  // One PDF per child — a mum with 2-3 kids selects all the PDFs at once and
  // the form walks through them: save one, the next loads pre-filled.
  async function readPdfs(files: File[]) {
    setUploading(true)
    try {
      const parsed: Parsed[] = []
      const errors: string[] = []
      for (const file of files) {
        const fd = new FormData(); fd.append('file', file)
        const r = await fetch('/api/vouchers/parse', { method: 'POST', body: fd })
        const j = await r.json()
        if (!r.ok) { errors.push(`${file.name}: ${j.error || 'could not read'}`); continue }
        parsed.push(toParsed(j))
      }
      if (errors.length) alert('Some files could not be read:\n' + errors.join('\n'))
      if (!parsed.length) return
      const [first, ...rest] = parsed
      setQueue(rest)
      loadParsed(first, rest.length)
    } finally { setUploading(false) }
  }

  async function add() {
    if (!form.family_name && !form.student_name) { alert('Add at least a family or child name.'); return }
    const amount = Number(form.amount) || 200
    const term_start = form.redeemed_on || null
    // Rhett's rule: a voucher covers ONE term and dies at THAT term's end,
    // no matter how late in the term it was handed over.
    const term = form.redeemed_on ? termFor(form.redeemed_on) : null
    const term_end = term?.end ?? null
    const weeksLeft = form.redeemed_on && term_end
      ? Math.max(1, Math.round((new Date(term_end).getTime() - new Date(form.redeemed_on).getTime()) / 604800000))
      : 8
    const weeks = weeksLeft
    const weekly_value = Math.round(amount / weeks)
    const body = { ...form, voucher_ref: form.voucher_ref.trim(), photo_url: form.photo_url || null, redeemed_on: form.redeemed_on || null, term_start, term_end, amount, weekly_value, weeks, status: 'active' }
    if (editingId) {
      const r = await fetch('/api/vouchers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, id: editingId, status: undefined }) })
      const j = await r.json(); if (j.voucher) { setItems((xs) => xs.map((v) => v.id === editingId ? j.voucher : v)); resetForm(); router.refresh() }
      else alert(j.error || 'Could not save changes')
      return
    }
    const r = await fetch('/api/vouchers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json()
    if (j.voucher) {
      setItems((xs) => [...xs, j.voucher])
      if (queue.length) {
        // next kid's voucher from the same upload — keep the form open, pre-filled
        const [next, ...rest] = queue
        setQueue(rest)
        loadParsed(next, rest.length)
      } else { resetForm() }
      router.refresh()
    }
    else alert(j.error || 'Could not save voucher')
  }
  async function setStatus(id: string, status: Voucher['status']) {
    await fetch('/api/vouchers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    setItems((xs) => xs.map((v) => v.id === id ? { ...v, status } : v))
  }
  async function remove(id: string) {
    if (!confirm('Delete this voucher record?')) return
    await fetch(`/api/vouchers?id=${id}`, { method: 'DELETE' }); setItems((xs) => xs.filter((v) => v.id !== id))
  }

  const Stat = ({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) => (
    <div className={`bg-white rounded-xl border p-4 ${accent ?? 'border-zinc-200'}`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wide">{icon}{label}</div>
      <div className="text-2xl font-extrabold text-zinc-900 mt-1">{value}</div>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<Ticket size={13} />} label="Active vouchers" value={String(active.length)} />
        <Stat icon={<TrendingUp size={13} />} label="Gov funding claimed" value={`$${funded.toLocaleString()}`} />
        <Stat icon={<AlertTriangle size={13} />} label="Ending soon" value={String(endingSoon.length)} accent={endingSoon.length ? 'border-amber-300 bg-amber-50' : 'border-zinc-200'} />
        <Stat icon={<ArrowUpRight size={13} />} label="Converted to members" value={`${converted.length} · ${convRate}%`} />
      </div>

      {endingSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          ⏰ <strong>{endingSoon.length} voucher{endingSoon.length > 1 ? 's' : ''} ending within 2 weeks</strong> — time to invite {endingSoon.length > 1 ? 'these families' : 'this family'} onto the $30/week membership: {endingSoon.map((v) => v.family_name || v.student_name).filter(Boolean).join(', ')}.
        </div>
      )}

      {/* add */}
      {!adding && <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 bg-[#D72027] text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-[#A0151B]"><Plus size={15} /> Log a voucher</button>}
      {adding && (
        <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3 max-w-2xl">
          {!editingId && (
            <label className="flex items-center gap-3 border-2 border-dashed border-[#D72027]/40 bg-red-50/40 rounded-xl px-4 py-3 cursor-pointer hover:bg-red-50">
              <FileText size={20} className="text-[#D72027] shrink-0" />
              <span className="text-sm">
                <span className="font-bold text-zinc-900">{uploading ? 'Reading the voucher(s)…' : 'Upload voucher PDFs — I’ll read them for you'}</span>
                <span className="block text-xs text-zinc-500">Two or three kids? Select ALL their voucher PDFs at once — save one, the next loads itself. You just check and save each.</span>
              </span>
              <input type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(e) => { const fs = Array.from(e.target.files || []); if (fs.length) readPdfs(fs); e.target.value = '' }} />
            </label>
          )}
          {parsedNote && <p className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2">{parsedNote}</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Family name" value={form.family_name} onChange={(v) => setForm({ ...form, family_name: v })} placeholder="e.g. Brennan" />
            <Field label="Child name" value={form.student_name} onChange={(v) => setForm({ ...form, student_name: v })} placeholder="e.g. Aidyn" />
            <Field label="Voucher reference" value={form.voucher_ref} onChange={(v) => setForm({ ...form, voucher_ref: v })} placeholder="voucher code" />
            <Field label="Voucher amount ($)" value={form.amount} onChange={(v) => setForm({ ...form, amount: v.replace(/[^0-9.]/g, '') })} placeholder="200" />
            <div><label className="text-xs font-bold uppercase tracking-wide text-zinc-400 mb-1 block">Date redeemed</label><input type="date" className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" value={form.redeemed_on} onChange={(e) => setForm({ ...form, redeemed_on: e.target.value })} /></div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-zinc-400 mb-1 block">Used for</label>
              <select className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white" value={form.use_type ?? 'term'} onChange={(e) => setForm({ ...form, use_type: e.target.value as Voucher['use_type'] })}>
                <option value="term">📚 Term classes</option>
                <option value="workshop">🎪 Holiday workshop</option>
                <option value="both">📚🎪 Both</option>
                <option value="unused">⏳ Not used yet</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-zinc-400 mb-1 block">Photo or PDF of voucher</label>
              {form.photo_url ? (
                <div className="flex items-center gap-2">
                  {isPdf(form.photo_url) ? (
                    <a href={form.photo_url} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-lg border border-zinc-200 flex items-center justify-center text-xl bg-red-50" title="View voucher PDF">📄</a>
                  ) : (
                    <img src={form.photo_url} alt="voucher" className="w-12 h-12 rounded-lg object-cover border border-zinc-200" />
                  )}
                  <button onClick={() => setForm({ ...form, photo_url: '' })} className="text-xs text-zinc-500 hover:text-red-600">remove</button>
                </div>
              ) : (
                <label className="inline-flex items-center gap-2 text-sm text-zinc-600 border border-dashed border-zinc-300 rounded-lg px-3 py-2 cursor-pointer hover:bg-zinc-50">
                  {uploading ? 'Uploading…' : '📷 Photo / 📄 PDF'}
                  <input type="file" accept="image/*,application/pdf,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f) }} />
                </label>
              )}
            </div>
          </div>
          {form.redeemed_on && (() => { const t = termFor(form.redeemed_on); return (
            <p className="text-xs text-zinc-500">→ Valid for <strong>{t?.label ?? 'this term'} only</strong>, ending <strong>{t ? fmt(t.end) : '—'}</strong> — no matter how late in the term the voucher was handed over. An admin reminder to set up their next-term subscription is created automatically.</p>
          ) })()}
          <div className="flex gap-2">
            <button onClick={add} className="bg-[#D72027] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#A0151B]">{editingId ? 'Save changes' : 'Save voucher'}</button>
            <button onClick={resetForm} className="text-sm text-zinc-500 px-3 py-2">Cancel</button>
          </div>
        </div>
      )}

      {/* list */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-2 px-4 py-2.5 bg-zinc-50 text-[11px] font-bold uppercase tracking-wide text-zinc-400">
          <span>Family / Child</span><span>Voucher</span><span>Term ends</span><span>Status</span><span></span>
        </div>
        {items.length === 0 && <div className="px-4 py-10 text-center text-sm text-zinc-400">No vouchers logged yet. Tap “Log a voucher” after you redeem one on the Play On portal.</div>}
        {items.map((v) => {
          const d = daysTo(v.term_end); const soon = v.status === 'active' && d !== null && d <= 14
          return (
            <div key={v.id} className={`grid grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-2 px-4 py-3 border-t border-zinc-100 items-center text-sm ${soon ? 'bg-amber-50/50' : ''}`}>
              <div className="flex items-center gap-2">
                {v.photo_url && (isPdf(v.photo_url)
                  ? <a href={v.photo_url} target="_blank" rel="noreferrer" title="View voucher PDF" className="w-9 h-9 rounded border border-zinc-200 shrink-0 flex items-center justify-center bg-red-50">📄</a>
                  : <a href={v.photo_url} target="_blank" rel="noreferrer" title="View voucher photo"><img src={v.photo_url} alt="" className="w-9 h-9 rounded object-cover border border-zinc-200 shrink-0" /></a>)}
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-900 truncate">{v.family_name || '—'}</div>
                  <div className="text-xs text-zinc-500 truncate">
                    {v.student_name}
                    {v.voucher_ref && <span className="ml-1.5 font-mono text-[10px] font-bold bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 px-1.5 py-0.5 rounded" title="This child's voucher">{v.voucher_ref}</span>}
                    {v.use_type ? ` · ${USE_LABEL[v.use_type]}` : ''}
                  </div>
                </div>
              </div>
              <div className="text-zinc-600">{v.voucher_ref || '—'}<div className="text-[11px] text-zinc-400">${Number(v.amount).toFixed(0)}</div></div>
              <div className="text-zinc-600">{fmt(v.term_end)}{v.status === 'active' && d !== null && <div className={`text-[11px] ${soon ? 'text-amber-700 font-semibold' : 'text-zinc-400'}`}>{d < 0 ? 'overdue' : `${d} days left`}</div>}</div>
              <div><span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${STATUS_CHIP[v.status]}`}>{v.status}</span></div>
              <div className="flex items-center gap-1 justify-end">
                {v.status === 'active' && <button onClick={() => setStatus(v.id, 'converted')} className="text-[11px] font-semibold text-blue-700 hover:underline px-1.5" title="Mark as moved onto a paid membership">Converted ✓</button>}
                {v.status === 'active' && <button onClick={() => setStatus(v.id, 'expired')} className="text-[11px] text-zinc-400 hover:text-zinc-700 px-1" title="Expired without converting">Expired</button>}
                <button onClick={() => startEdit(v)} className="p-1 text-zinc-300 hover:text-blue-600" title="Edit this voucher"><Pencil size={13} /></button>
                <button onClick={() => remove(v.id)} className="p-1 text-zinc-300 hover:text-red-600"><Trash2 size={13} /></button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <div><label className="text-xs font-bold uppercase tracking-wide text-zinc-400 mb-1 block">{label}</label><input className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-900" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></div>
}

function SetupCard({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="bg-white rounded-xl border border-amber-200 p-6 max-w-2xl">
      <h2 className="text-lg font-bold text-zinc-900 mb-2">🔧 One-time setup (30 seconds)</h2>
      <p className="text-sm text-zinc-600 mb-3">Your voucher tracker is built — it just needs its storage switched on once. Paste the code below into the Supabase SQL editor and run it, then refresh.</p>
      <a href="https://supabase.com/dashboard/project/dbpbfcxhbaeyoyoyllfp/sql/new" target="_blank" className="inline-block text-sm font-semibold text-[#D72027] mb-3">Open the SQL editor →</a>
      <div className="relative">
        <pre className="bg-zinc-900 text-zinc-100 text-[11px] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{sql}</pre>
        <button onClick={() => { navigator.clipboard.writeText(sql); setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="absolute top-2 right-2 inline-flex items-center gap-1 bg-white/10 text-white text-xs px-2 py-1 rounded">{copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}</button>
      </div>
    </div>
  )
}
