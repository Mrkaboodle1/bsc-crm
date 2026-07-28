'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X, Plus, Trash2 } from 'lucide-react'

export type Family = {
  id: string; family_name: string; primary_parent: string | null; email: string | null
  phone: string | null; emergency_phone: string | null; address: string | null
  source: string | null; lifecycle_stage: string | null
}
export type Kid = { id: string; first_name: string; last_name: string | null; date_of_birth: string | null }

const SOURCES = [['', '—'], ['fb_ad', '📘 Facebook ad'], ['instagram', '📸 Instagram'], ['google', '🔍 Google'], ['word_of_mouth', '💬 Word of mouth'], ['school', '🏫 School'], ['walkin', '🚪 Walk-in'], ['open_day', '🎪 Open day'], ['other', '✨ Other']]
const STAGES = ['lead', 'trial', 'active', 'paused', 'past', 'lost']
const LIFECYCLE_CLS: Record<string, string> = { active: 'bg-emerald-100 text-emerald-800', trial: 'bg-blue-100 text-blue-800', lead: 'bg-amber-100 text-amber-800', paused: 'bg-zinc-100 text-zinc-600', past: 'bg-zinc-100 text-zinc-500', lost: 'bg-red-50 text-red-700' }
const inp = 'w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-900'
const initials = (n: string) => { const p = n.trim().split(/\s+/); return (p.length >= 2 ? p[0][0] + p[p.length - 1][0] : n.slice(0, 2)).toUpperCase() }

export function ContactProfileEditor({ family, tagPicker }: { family: Family; tagPicker?: React.ReactNode }) {
  const router = useRouter()
  const [edit, setEdit] = useState(false)
  const [busy, setBusy] = useState(false)
  const [f, setF] = useState<Family>(family)
  const set = (k: keyof Family, v: string) => setF((x) => ({ ...x, [k]: v }))
  async function save() {
    if (!f.family_name.trim()) { alert('Name cannot be empty.'); return }
    setBusy(true)
    const r = await fetch('/api/contacts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
    setBusy(false)
    if (r.ok) { setEdit(false); router.refresh() } else { const j = await r.json().catch(() => ({})); alert(j.error || 'Could not save') }
  }
  async function remove() {
    const label = f.primary_parent || f.family_name
    if (!confirm(`Delete "${label}" and all their kids, classes and appointments? This cannot be undone.`)) return
    setBusy(true)
    const r = await fetch(`/api/contacts?id=${family.id}`, { method: 'DELETE' })
    if (r.ok) { router.push('/contacts') } else { setBusy(false); const j = await r.json().catch(() => ({})); alert(j.error || 'Could not delete') }
  }
  const name = f.primary_parent || f.family_name
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
      <div className="flex items-start gap-3 mb-3">
        <span className="w-14 h-14 rounded-full bg-gradient-to-br from-[#D72027] to-[#FFC107] text-white flex items-center justify-center text-base font-extrabold shrink-0">{initials(name)}</span>
        <div className="min-w-0 flex-1">
          {!edit && <><div className="text-lg font-extrabold text-zinc-900 truncate">{name}</div>{f.primary_parent && <div className="text-xs text-zinc-500 truncate">{f.family_name} family</div>}</>}
          {edit && <div className="space-y-1.5"><input className={inp} value={f.primary_parent ?? ''} onChange={(e) => set('primary_parent', e.target.value)} placeholder="Parent name" /><input className={inp} value={f.family_name} onChange={(e) => set('family_name', e.target.value)} placeholder="Family name" /></div>}
          {f.lifecycle_stage && !edit && <span className={`inline-block mt-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${LIFECYCLE_CLS[f.lifecycle_stage] ?? 'bg-zinc-100'}`}>{f.lifecycle_stage}</span>}
        </div>
        {!edit && <button onClick={() => setEdit(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-[#D72027] border border-zinc-200 rounded-lg px-2.5 py-1.5"><Pencil size={12} /> Edit</button>}
      </div>

      {tagPicker && <div className="mb-3">{tagPicker}</div>}

      {!edit ? (
        <dl className="space-y-2 text-sm border-t border-zinc-100 pt-3">
          <Row label="Email" value={f.email} link={f.email ? `mailto:${f.email}` : null} />
          <Row label="Phone" value={f.phone} link={f.phone ? `tel:${f.phone}` : null} />
          {f.emergency_phone && <Row label="Emergency" value={f.emergency_phone} />}
          {f.address && <Row label="Address" value={f.address} />}
          <Row label="Source" value={(SOURCES.find((s) => s[0] === f.source)?.[1]) ?? (f.source || '—')} />
        </dl>
      ) : (
        <div className="space-y-2 border-t border-zinc-100 pt-3">
          <Field label="Email"><input className={inp} value={f.email ?? ''} onChange={(e) => set('email', e.target.value)} placeholder="email@example.com" /></Field>
          <Field label="Phone"><input className={inp} value={f.phone ?? ''} onChange={(e) => set('phone', e.target.value)} placeholder="0400 000 000" /></Field>
          <Field label="Emergency phone"><input className={inp} value={f.emergency_phone ?? ''} onChange={(e) => set('emergency_phone', e.target.value)} placeholder="optional" /></Field>
          <Field label="Address"><input className={inp} value={f.address ?? ''} onChange={(e) => set('address', e.target.value)} placeholder="Street, suburb" /></Field>
          <Field label="Source"><select className={inp} value={f.source ?? ''} onChange={(e) => set('source', e.target.value)}>{SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Stage"><select className={inp} value={f.lifecycle_stage ?? 'lead'} onChange={(e) => set('lifecycle_stage', e.target.value)}>{STAGES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
          <div className="flex items-center gap-2 pt-1">
            <button onClick={save} disabled={busy} className="inline-flex items-center gap-1 bg-[#D72027] text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-[#A0151B] disabled:opacity-50">{busy ? 'Saving…' : <><Check size={14} /> Save</>}</button>
            <button onClick={() => { setF(family); setEdit(false) }} className="inline-flex items-center gap-1 text-sm text-zinc-500 px-2 py-1.5"><X size={14} /> Cancel</button>
            <div className="flex-1" />
            <button onClick={remove} disabled={busy} className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-50 disabled:opacity-50"><Trash2 size={13} /> Delete contact</button>
          </div>
        </div>
      )}
    </div>
  )
}

type ClassLite = { id: string; name: string }
type Enrolment = { id: string; classId: string; className: string }

export function ContactKidsEditor({ familyId, initial, classes = [], enrolments = {} }: { familyId: string; initial: Kid[]; classes?: ClassLite[]; enrolments?: Record<string, Enrolment[]> }) {
  const router = useRouter()
  const [kids, setKids] = useState<Kid[]>(initial)
  const [enr, setEnr] = useState<Record<string, Enrolment[]>>(enrolments)
  const [busy, setBusy] = useState<string | null>(null)
  const upd = (id: string, patch: Partial<Kid>) => setKids((ks) => ks.map((k) => k.id === id ? { ...k, ...patch } : k))

  async function addToClass(kidId: string, classId: string) {
    const cls = classes.find((c) => c.id === classId); if (!cls) return
    const r = await fetch('/api/enrolments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: kidId, class_id: classId }) })
    const j = await r.json()
    if (j.ok && j.id) setEnr((e) => ({ ...e, [kidId]: [...(e[kidId] ?? []).filter((x) => x.classId !== classId), { id: j.id, classId, className: j.className || cls.name }] }))
    else alert(j.error || 'Could not add to class')
  }
  async function removeFromClass(kidId: string, enrolId: string) {
    setEnr((e) => ({ ...e, [kidId]: (e[kidId] ?? []).filter((x) => x.id !== enrolId) }))
    fetch(`/api/enrolments?id=${enrolId}`, { method: 'DELETE' }).catch(() => {})
  }

  async function saveKid(k: Kid) {
    setBusy(k.id)
    await fetch('/api/students', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: k.id, first_name: k.first_name, last_name: k.last_name, date_of_birth: k.date_of_birth }) })
    setBusy(null); router.refresh()
  }
  async function addKid() {
    const r = await fetch('/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ family_id: familyId, first_name: 'New child' }) })
    const j = await r.json(); if (j.id) setKids((ks) => [...ks, { id: j.id, first_name: 'New child', last_name: '', date_of_birth: null }])
  }
  async function delKid(id: string) {
    if (!confirm('Remove this child?')) return
    await fetch(`/api/students?id=${id}`, { method: 'DELETE' }); setKids((ks) => ks.filter((k) => k.id !== id)); router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Kids ({kids.length})</div>
        <button onClick={addKid} className="inline-flex items-center gap-1 text-xs font-semibold text-[#D72027] hover:underline"><Plus size={12} /> Add child</button>
      </div>
      {kids.length === 0 && <p className="text-xs text-zinc-500">No kids yet — tap “Add child”.</p>}
      <div className="space-y-3">
        {kids.map((k) => (
          <div key={k.id} className="border border-zinc-100 rounded-xl p-2.5">
            <div className="grid grid-cols-2 gap-2">
              <input className={inp} value={k.first_name} onChange={(e) => upd(k.id, { first_name: e.target.value })} placeholder="First name" />
              <input className={inp} value={k.last_name ?? ''} onChange={(e) => upd(k.id, { last_name: e.target.value })} placeholder="Last name" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <label className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Birthday</label>
              <input type="date" className="flex-1 px-2 py-1 border border-zinc-200 rounded-lg text-sm" value={k.date_of_birth ?? ''} onChange={(e) => upd(k.id, { date_of_birth: e.target.value })} />
            </div>
            <div className="mt-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-1">Classes</div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(enr[k.id] ?? []).map((e) => (
                  <span key={e.id} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-lg ring-1 ring-inset ring-emerald-200">
                    {e.className}
                    <button onClick={() => removeFromClass(k.id, e.id)} className="hover:text-red-600" title="Remove from class"><X size={11} /></button>
                  </span>
                ))}
                {(enr[k.id] ?? []).length === 0 && <span className="text-[11px] text-zinc-400 italic">Not in a class yet</span>}
                {classes.length > 0 && (
                  <select defaultValue="" onChange={(ev) => { if (ev.target.value) { addToClass(k.id, ev.target.value); ev.target.value = '' } }} className="text-[11px] font-semibold border border-dashed border-zinc-300 rounded-lg px-1.5 py-1 text-[#D72027] bg-white cursor-pointer">
                    <option value="">+ Add to class…</option>
                    {classes.filter((c) => !(enr[k.id] ?? []).some((e) => e.classId === c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <a href={`/students/${k.id}`} className="text-[11px] font-semibold text-zinc-500 hover:text-[#D72027]">Open profile →</a>
              <div className="flex-1" />
              <button onClick={() => saveKid(k)} disabled={busy === k.id} className="text-[11px] font-semibold bg-zinc-900 text-white px-2.5 py-1 rounded-md disabled:opacity-50">{busy === k.id ? 'Saving…' : 'Save'}</button>
              <button onClick={() => delKid(k.id)} className="p-1 text-zinc-300 hover:text-red-600"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Row({ label, value, link }: { label: string; value: string | null; link?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 shrink-0">{label}</dt>
      <dd className="text-zinc-900 text-right text-sm font-bold truncate">{value ? (link ? <a href={link} className="hover:underline">{value}</a> : value) : '—'}</dd>
    </div>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 block mb-0.5">{label}</label>{children}</div>
}
