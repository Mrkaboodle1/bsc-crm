'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, LogOut, Check, X, AlertTriangle, Phone, FileWarning, ChevronDown, ChevronUp, UserPlus } from 'lucide-react'
import type { AttendanceRow } from '@/lib/coach-portal'

const timeOf = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }) : ''

export function WorkshopDayBoard({ workshopId, workshopDate, initial }: { workshopId: string; workshopDate?: string; initial: AttendanceRow[] }) {
  const router = useRouter()
  const [rows, setRows] = useState<AttendanceRow[]>(initial)
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [nf, setNf] = useState({ child_name: '', parent_name: '', parent_contact: '', medical: '' })

  async function addChild() {
    if (!nf.child_name.trim()) return
    setBusy('add')
    const r = await fetch('/api/workshops/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workshop_id: workshopId, ...nf }) })
    const j = await r.json(); setBusy(null)
    if (j.id) {
      setRows((rs) => [...rs, { id: j.id, child_name: nf.child_name.trim(), parent_name: nf.parent_name || null, parent_contact: nf.parent_contact || null, medical: nf.medical || null, status: 'expected', signed_in_at: null, signed_out_at: null, signed_out_to: null, incident: null, notes: null }])
      setNf({ child_name: '', parent_name: '', parent_contact: '', medical: '' }); setAdding(false)
    } else alert(j.error || 'Could not add')
  }

  const present = rows.filter((r) => r.status === 'present').length
  const out = rows.filter((r) => r.signed_out_at).length
  const inBuilding = rows.filter((r) => r.signed_in_at && !r.signed_out_at).length

  async function act(id: string, body: Record<string, unknown>, optimistic: (r: AttendanceRow) => AttendanceRow) {
    setBusy(id)
    setRows((rs) => rs.map((r) => r.id === id ? optimistic(r) : r))
    const res = await fetch('/api/workshops/attendance', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }) })
    setBusy(null)
    if (!res.ok) { router.refresh(); const j = await res.json().catch(() => ({})); alert(j.error || 'Could not save') }
  }
  const signIn = (r: AttendanceRow) => act(r.id, { action: 'signin' }, (x) => ({ ...x, status: 'present', signed_in_at: new Date().toISOString() }))
  const signOut = (r: AttendanceRow) => {
    const to = window.prompt(`Who is collecting ${r.child_name}?`, r.parent_name || '')
    if (to === null) return
    act(r.id, { action: 'signout', signed_out_to: to }, (x) => ({ ...x, signed_out_at: new Date().toISOString(), signed_out_to: to }))
  }
  const setAbsent = (r: AttendanceRow) => act(r.id, { action: 'absent' }, (x) => ({ ...x, status: 'absent' }))
  const reset = (r: AttendanceRow) => act(r.id, { action: 'reset' }, (x) => ({ ...x, status: 'expected', signed_in_at: null, signed_out_at: null, signed_out_to: null }))
  async function saveField(id: string, field: 'notes' | 'incident' | 'child_name' | 'medical', value: string) {
    setRows((rs) => rs.map((r) => r.id === id ? { ...r, [field]: value } : r))
    // never fail silently — a coach must KNOW if their note didn't stick
    const res = await fetch('/api/workshops/attendance', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, [field]: value }) })
    if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error || 'Could not save — please try again'); router.refresh() }
  }
  function removeChild(r: AttendanceRow) {
    if (!confirm(`Remove ${r.child_name} from this day?`)) return
    setRows((rs) => rs.filter((x) => x.id !== r.id))
    fetch(`/api/workshops/attendance?id=${r.id}`, { method: 'DELETE' }).catch(() => {})
  }

  return (
    <div>
      {/* summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label="Expected" value={rows.length} cls="bg-zinc-100 text-zinc-700" />
        <Stat label="Here now" value={inBuilding} cls="bg-emerald-100 text-emerald-800" />
        <Stat label="Signed out" value={out} cls="bg-blue-100 text-blue-800" />
      </div>

      {/* Add a child on the day (walk-ins / missed bookings) */}
      {adding ? (
        <div className="bg-white rounded-2xl border-2 border-[#D72027] p-3 mb-3 space-y-2">
          <input autoFocus value={nf.child_name} onChange={(e) => setNf({ ...nf, child_name: e.target.value })} placeholder="Child's name *" className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none" />
          <div className="grid grid-cols-2 gap-2">
            <input value={nf.parent_name} onChange={(e) => setNf({ ...nf, parent_name: e.target.value })} placeholder="Parent name" className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none" />
            <input value={nf.parent_contact} onChange={(e) => setNf({ ...nf, parent_contact: e.target.value })} placeholder="Parent phone/email" className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none" />
          </div>
          <input value={nf.medical} onChange={(e) => setNf({ ...nf, medical: e.target.value })} placeholder="Allergies / medical (optional)" className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none" />
          <div className="flex gap-2">
            <button onClick={addChild} disabled={busy === 'add' || !nf.child_name.trim()} className="bg-[#D72027] text-white font-bold text-sm px-4 py-2 rounded-lg disabled:opacity-50">{busy === 'add' ? 'Adding…' : 'Add child'}</button>
            <button onClick={() => { setAdding(false); setNf({ child_name: '', parent_name: '', parent_contact: '', medical: '' }) }} className="text-sm font-semibold text-zinc-500 px-3">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="w-full mb-3 inline-flex items-center justify-center gap-2 bg-white border-2 border-dashed border-zinc-300 hover:border-[#D72027] hover:text-[#D72027] text-zinc-500 font-bold text-sm py-2.5 rounded-2xl"><UserPlus size={16} /> Add a child to this day</button>
      )}

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-sm text-zinc-500">No children booked for this day yet — tap “Add a child” above.</div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const isOut = !!r.signed_out_at, isIn = !!r.signed_in_at && !isOut, isAbsent = r.status === 'absent'
            const expanded = open === r.id
            return (
              <li key={r.id} className={`bg-white rounded-2xl border-2 p-3 ${isAbsent ? 'border-zinc-100 opacity-70' : isOut ? 'border-blue-200' : isIn ? 'border-emerald-300' : 'border-zinc-200'}`}>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-zinc-900 truncate">{r.child_name}</span>
                      {r.medical && <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded"><AlertTriangle size={11} /> {r.medical}</span>}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate">
                      {r.parent_name || '—'}
                      {r.signed_in_at && <span className="text-emerald-600"> · in {timeOf(r.signed_in_at)}</span>}
                      {r.signed_out_at && <span className="text-blue-600"> · out {timeOf(r.signed_out_at)}{r.signed_out_to ? ` to ${r.signed_out_to}` : ''}</span>}
                    </div>
                  </div>
                  {/* actions */}
                  {!isOut && !isAbsent && !isIn && (
                    <button onClick={() => signIn(r)} disabled={busy === r.id} className="inline-flex items-center gap-1.5 bg-emerald-600 text-white font-extrabold text-sm px-3 py-2 rounded-xl disabled:opacity-50"><LogIn size={15} /> Sign in</button>
                  )}
                  {isIn && (
                    <button onClick={() => signOut(r)} disabled={busy === r.id} className="inline-flex items-center gap-1.5 bg-blue-600 text-white font-extrabold text-sm px-3 py-2 rounded-xl disabled:opacity-50"><LogOut size={15} /> Sign out</button>
                  )}
                  {isOut && <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg"><Check size={13} /> Collected</span>}
                  {isAbsent && <span className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 bg-zinc-100 px-2.5 py-1.5 rounded-lg">Absent</span>}
                  <button onClick={() => setOpen(expanded ? null : r.id)} className="p-2 text-zinc-400 hover:text-zinc-700">{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                </div>

                {expanded && (
                  <div className="mt-3 border-t border-zinc-100 pt-3 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      {r.parent_contact && <a href={r.parent_contact.includes('@') ? `mailto:${r.parent_contact}` : `tel:${r.parent_contact}`} className="inline-flex items-center gap-1.5 font-semibold text-zinc-700 bg-zinc-100 px-2.5 py-1.5 rounded-lg"><Phone size={13} /> {r.parent_contact}</a>}
                      {!isAbsent && <button onClick={() => setAbsent(r)} className="text-xs font-bold text-zinc-500 border border-zinc-200 px-2.5 py-1.5 rounded-lg hover:bg-zinc-50">Mark absent</button>}
                      {(isAbsent || isIn || isOut) && <button onClick={() => reset(r)} className="text-xs font-bold text-zinc-400 px-2 py-1.5 hover:text-zinc-700">Reset</button>}
                      <button onClick={() => removeChild(r)} className="text-xs font-bold text-red-600 border border-red-200 px-2.5 py-1.5 rounded-lg hover:bg-red-50 ml-auto">🗑 Remove from day</button>
                    </div>
                    <Editable label="Edit child's name" value={r.child_name} onSave={(v) => saveField(r.id, 'child_name', v)} />
                    <Editable label="Medical / allergy alert" value={r.medical || ''} onSave={(v) => saveField(r.id, 'medical', v)} />
                    <Editable label="Coach note" value={r.notes || ''} onSave={(v) => saveField(r.id, 'notes', v)} multiline />
                    {r.incident && <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800"><b>⚠️ Old quick incident note:</b> {r.incident}</div>}
                    <a href={`/incidents?new=1&child=${encodeURIComponent(r.child_name)}${workshopDate ? `&date=${workshopDate}` : ''}&workshop=${workshopId}`}
                      className="flex items-center justify-center gap-2 bg-red-600 text-white font-extrabold text-sm py-2.5 rounded-xl hover:bg-red-700">
                      🚑 Log incident report for {r.child_name.split(' ')[0]} — full form
                    </a>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <p className="text-xs text-zinc-400 mt-3 text-center">Tap <strong>Sign in</strong> on arrival, <strong>Sign out</strong> when collected. Open a child (⌄) for medical, contact, notes & incidents.</p>
    </div>
  )
}

function Stat({ label, value, cls }: { label: string; value: number; cls: string }) {
  return <div className={`rounded-xl p-3 text-center ${cls}`}><div className="text-2xl font-extrabold">{value}</div><div className="text-[10px] font-bold uppercase tracking-wide">{label}</div></div>
}

function Editable({ label, value, onSave, multiline, icon }: { label: string; value: string; onSave: (v: string) => void; multiline?: boolean; icon?: boolean }) {
  const [v, setV] = useState(value)
  const [saved, setSaved] = useState(false)
  const dirty = v !== value
  function save() { onSave(v.trim()); setSaved(true); setTimeout(() => setSaved(false), 1500) }
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <FileWarning size={12} className="text-amber-600" />}
        <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</span>
        {saved && <span className="text-[10px] font-bold text-emerald-600">saved ✓</span>}
      </div>
      <div className="flex items-start gap-2">
        {multiline
          ? <textarea value={v} onChange={(e) => setV(e.target.value)} rows={2} className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none" />
          : <input value={v} onChange={(e) => setV(e.target.value)} className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none" />}
        {dirty && <button onClick={save} className="bg-zinc-900 text-white text-xs font-bold px-3 py-2 rounded-lg shrink-0">Save</button>}
      </div>
    </div>
  )
}
