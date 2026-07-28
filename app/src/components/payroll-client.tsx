'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Users, CalendarDays, X, Check, AlertTriangle } from 'lucide-react'

export type Person = { id: string; name: string; kind: string; super_applies: boolean; super_rate: number; default_amount: number; abn: string | null; super_fund: string | null; active: boolean }
type Item = { id: string; person_id: string | null; name: string | null; gross: number; super: number; wage_paid: boolean; super_paid: boolean }
type Run = { id: string; pay_date: string; period_start: string; period_end: string; super_due: string; status: string; items: Item[] }

const money = (n: number) => `$${(Number(n) || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmt = (d: string | null) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'
const addFortnight = (iso: string) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10) }
const KIND: Record<string, string> = { contractor: 'Contractor', employee: 'Employee', owner: 'Owner' }
const inp = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#D72027]'

export function PayrollClient({ initialPeople }: { initialPeople: Person[] }) {
  const [tab, setTab] = useState<'runs' | 'people'>('runs')
  const [people, setPeople] = useState<Person[]>(initialPeople)
  const [runs, setRuns] = useState<Run[]>([])
  const [editP, setEditP] = useState<Person | null>(null)
  const [addingP, setAddingP] = useState(false)

  useEffect(() => { fetch('/api/payroll/runs').then(r => r.json()).then(j => { if (j.ok) setRuns(j.runs) }).catch(() => {}) }, [])

  const todayIso = new Date().toISOString().slice(0, 10)
  const superOwed = runs.flatMap(r => r.items).filter(i => !i.super_paid).reduce((s, i) => s + Number(i.super), 0)
  const nextDue = runs.filter(r => r.items.some(i => !i.super_paid)).map(r => r.super_due).filter(Boolean).sort()[0]

  async function newRun() {
    const suggested = runs[0]?.pay_date ? addFortnight(runs[0].pay_date) : todayIso
    const pay_date = window.prompt('Pay date for this fortnight (YYYY-MM-DD). Super is due within 7 business days — best to pay it on payday.', suggested)
    if (!pay_date) return
    const r = await fetch('/api/payroll/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pay_date }) })
    const j = await r.json(); if (j.ok) setRuns(rs => [j.run, ...rs]); else alert(j.error || 'Could not create')
  }
  async function delRun(id: string) {
    if (!confirm('Delete this pay run?')) return
    setRuns(rs => rs.filter(r => r.id !== id))
    fetch(`/api/payroll/runs?id=${id}`, { method: 'DELETE' }).catch(() => {})
  }
  function patchItem(runId: string, item: Item, patch: Partial<Item>) {
    const merged = { ...item, ...patch }
    setRuns(rs => rs.map(r => r.id === runId ? { ...r, items: r.items.map(i => i.id === item.id ? merged : i) } : r))
    fetch('/api/payroll/runs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item: { id: item.id, ...patch } }) }).catch(() => {})
  }
  function editGross(runId: string, item: Item, v: string) {
    const gross = Math.round((Number(v) || 0) * 100) / 100
    const person = people.find(p => p.id === item.person_id)
    const rate = person ? Number(person.super_rate) || 12 : 12
    const applies = person ? person.super_applies : true
    const sup = applies ? Math.round(gross * rate) / 100 : 0
    patchItem(runId, item, { gross, super: sup })
  }
  // "Pay on payday" one-tap: mark every wage or every super paid for a run.
  function markAll(run: Run, field: 'wage_paid' | 'super_paid', val: boolean) {
    run.items.forEach(it => patchItem(run.id, it, { [field]: val }))
  }

  return (
    <div className="space-y-5">
      {/* super-owed banner */}
      {superOwed > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-600 shrink-0" />
          <div className="text-sm text-amber-900"><strong>{money(superOwed)} super still to pay.</strong> {nextDue && <>Next lot due by <strong>{fmt(nextDue)}</strong>{nextDue < todayIso ? ' — overdue!' : ''}.</>} Pay it through your super clearing house / fund.</div>
        </div>
      )}

      <div className="inline-flex bg-zinc-100 rounded-full p-1 text-sm font-bold">
        <button onClick={() => setTab('runs')} className={`px-4 py-2 rounded-full inline-flex items-center gap-1.5 ${tab === 'runs' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500'}`}><CalendarDays size={15} /> Pay runs</button>
        <button onClick={() => setTab('people')} className={`px-4 py-2 rounded-full inline-flex items-center gap-1.5 ${tab === 'people' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500'}`}><Users size={15} /> People ({people.length})</button>
      </div>

      {tab === 'people' ? (
        <div className="space-y-3">
          <div className="flex justify-end"><button onClick={() => setAddingP(true)} className="inline-flex items-center gap-2 bg-[#D72027] text-white font-bold text-sm px-4 py-2.5 rounded-xl"><Plus size={16} /> Add person</button></div>
          {people.length === 0 ? <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-sm text-zinc-500">No one added yet. Add your coaches, trainees and yourself.</div> : (
            <div className="grid sm:grid-cols-2 gap-3">
              {people.map(p => (
                <button key={p.id} onClick={() => setEditP(p)} className="text-left bg-white rounded-2xl border border-zinc-200 p-4 hover:border-[#D72027]">
                  <div className="font-extrabold text-zinc-900">{p.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{KIND[p.kind] || p.kind} · usual {money(p.default_amount)}/pay · {p.super_applies ? `${p.super_rate}% super` : 'no super'}{p.active ? '' : ' · inactive'}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end"><button onClick={newRun} className="inline-flex items-center gap-2 bg-[#D72027] text-white font-bold text-sm px-4 py-2.5 rounded-xl"><Plus size={16} /> New pay run</button></div>
          {runs.length === 0 ? <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-sm text-zinc-500">No pay runs yet. Add your people first, then tap <strong>New pay run</strong>.</div> : runs.map(run => {
            const wages = run.items.reduce((s, i) => s + Number(i.gross), 0)
            const sup = run.items.reduce((s, i) => s + Number(i.super), 0)
            const allWagesPaid = run.items.length > 0 && run.items.every(i => i.wage_paid)
            const allSuperPaid = run.items.length > 0 && run.items.every(i => i.super_paid)
            return (
              <div key={run.id} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between gap-2 flex-wrap">
                  <div><div className="font-extrabold text-zinc-900">Pay {fmt(run.pay_date)}</div><div className="text-[11px] text-zinc-500">{fmt(run.period_start)}–{fmt(run.period_end)} · super due by {fmt(run.super_due)} <span className="text-zinc-400">(7 business days)</span></div></div>
                  <div className="text-right text-xs"><div className="text-zinc-500">Wages {money(wages)}</div><div className="font-bold text-amber-700">Super {money(sup)}</div></div>
                  <button onClick={() => delRun(run.id)} className="p-1.5 text-zinc-300 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
                {run.items.length > 0 && (
                  <div className="px-4 py-2.5 border-b border-zinc-100 bg-white flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-zinc-500 mr-1">Pay on payday →</span>
                    <button onClick={() => markAll(run, 'wage_paid', true)} className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${allWagesPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 text-white'}`}>{allWagesPaid ? '✓ All wages paid' : 'Mark all wages paid'}</button>
                    <button onClick={() => markAll(run, 'super_paid', true)} className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${allSuperPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-600 text-white'}`}>{allSuperPaid ? '✓ All super paid' : 'Mark all super paid'}</button>
                    {allWagesPaid && allSuperPaid && <span className="text-[11px] font-bold text-emerald-700">🎉 Done — remember to report this run through STP</span>}
                  </div>
                )}
                <div className="divide-y divide-zinc-50">
                  {run.items.length === 0 && <p className="p-4 text-sm text-zinc-400">No people on this run (add people first).</p>}
                  {run.items.map(it => (
                    <div key={it.id} className="flex items-center gap-2 px-4 py-2.5 text-sm flex-wrap">
                      <span className="font-semibold text-zinc-800 flex-1 min-w-[100px] truncate">{it.name}</span>
                      <label className="text-[11px] text-zinc-400">Gross $<input type="number" defaultValue={it.gross} onBlur={(e) => editGross(run.id, it, e.target.value)} className="w-20 ml-1 px-2 py-1 border border-zinc-200 rounded" /></label>
                      <span className="text-xs text-amber-700 font-bold w-24">super {money(it.super)}</span>
                      <button onClick={() => patchItem(run.id, it, { wage_paid: !it.wage_paid })} className={`text-[11px] font-bold px-2 py-1 rounded-lg ${it.wage_paid ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>{it.wage_paid ? '✓ wage paid' : 'wage'}</button>
                      <button onClick={() => patchItem(run.id, it, { super_paid: !it.super_paid })} className={`text-[11px] font-bold px-2 py-1 rounded-lg ${it.super_paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{it.super_paid ? '✓ super paid' : 'super'}</button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-xs text-zinc-500 space-y-1">
        <p className="font-bold text-zinc-700">📅 Payday Super (from 1 July 2026)</p>
        <p>• Super is <strong>12% of qualifying earnings</strong> (basically the gross you pay).</p>
        <p>• It must reach the fund <strong>within 7 business days of each payday</strong> — best practice is to pay it <strong>on payday</strong>, together with wages.</p>
        <p>• This screen works out and tracks it. You still make the actual payment through your <strong>super clearing house / fund</strong>, and report each run through your <strong>Single Touch Payroll (STP)</strong> tool.</p>
        <p className="text-zinc-400">General info, not tax advice — your accountant confirms your final setup.</p>
      </div>

      {(addingP || editP) && <PersonModal person={editP} onClose={() => { setAddingP(false); setEditP(null) }} onSaved={(p, isNew) => { setPeople(xs => isNew ? [...xs, p] : xs.map(x => x.id === p.id ? p : x)); setAddingP(false); setEditP(null) }} onDeleted={(id) => { setPeople(xs => xs.filter(x => x.id !== id)); setEditP(null) }} />}
    </div>
  )
}

function PersonModal({ person, onClose, onSaved, onDeleted }: { person: Person | null; onClose: () => void; onSaved: (p: Person, isNew: boolean) => void; onDeleted: (id: string) => void }) {
  const isEdit = !!person
  const [f, setF] = useState({ name: person?.name ?? '', kind: person?.kind ?? 'contractor', super_applies: person?.super_applies ?? true, super_rate: String(person?.super_rate ?? 12), default_amount: String(person?.default_amount ?? ''), active: person?.active ?? true })
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))
  async function save() {
    if (!f.name.trim()) { setErr('Name required'); return }
    setBusy(true); setErr('')
    const body = { id: person?.id, name: f.name, kind: f.kind, super_applies: f.super_applies, super_rate: Number(f.super_rate) || 12, default_amount: Number(f.default_amount) || 0, active: f.active }
    const r = await fetch('/api/payroll/people', { method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json()
    if (!r.ok) { setErr(j.error || 'Could not save'); setBusy(false); return }
    onSaved({ id: isEdit ? person!.id : j.row.id, name: f.name, kind: f.kind, super_applies: f.super_applies, super_rate: Number(f.super_rate) || 12, default_amount: Number(f.default_amount) || 0, abn: null, super_fund: null, active: f.active }, !isEdit)
  }
  async function del() { if (!person || !confirm(`Remove ${person.name}?`)) return; await fetch(`/api/payroll/people?id=${person.id}`, { method: 'DELETE' }); onDeleted(person.id) }
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-100"><h3 className="font-extrabold text-zinc-900">{isEdit ? 'Edit person' : 'Add person'}</h3><button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={20} /></button></div>
        <div className="p-5 space-y-3">
          <label className="block"><span className="text-xs font-semibold text-zinc-600">Name</span><input className={inp} value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus /></label>
          <label className="block"><span className="text-xs font-semibold text-zinc-600">They are a…</span><select className={inp} value={f.kind} onChange={(e) => set('kind', e.target.value)}><option value="contractor">Contractor (invoices)</option><option value="employee">Employee (wages)</option><option value="owner">Owner (me)</option></select></label>
          <label className="block"><span className="text-xs font-semibold text-zinc-600">Usual gross per pay ($)</span><input type="number" className={inp} value={f.default_amount} onChange={(e) => set('default_amount', e.target.value)} placeholder="0.00" /></label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-700"><input type="checkbox" className="w-4 h-4" checked={f.super_applies} onChange={(e) => set('super_applies', e.target.checked)} /> Pay super</label>
            {f.super_applies && <label className="text-sm text-zinc-600">at <input type="number" className="w-16 px-2 py-1 border border-zinc-200 rounded" value={f.super_rate} onChange={(e) => set('super_rate', e.target.value)} />%</label>}
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700"><input type="checkbox" className="w-4 h-4" checked={f.active} onChange={(e) => set('active', e.target.checked)} /> Active (include in new pay runs)</label>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex items-center justify-between gap-2 pt-1">
            {isEdit ? <button onClick={del} className="text-sm font-semibold text-red-600">Remove</button> : <span />}
            <button onClick={save} disabled={busy} className="bg-[#D72027] text-white font-extrabold text-sm px-6 py-2.5 rounded-xl disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
