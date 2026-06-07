'use client'

import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Search, Pencil, X, Trash2, Plus, AlertTriangle, ExternalLink, MonitorSmartphone, LayoutDashboard } from 'lucide-react'

export type Band = { id: string; nfc_uid: string; kind: string; label: string | null }
export type SBStudent = {
  id: string; name: string; photo_url: string | null; pin_code: string | null
  allergies: string | null; medical_notes: string | null; authorised_pickup: string | null
  bands: Band[]
}
export type SBSettings = { auto_text?: boolean; default_mode?: string }

const KIOSK = '/starband'
export function StarbandAdmin({ students, settings }: { students: SBStudent[]; settings: SBSettings }) {
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<SBStudent | null>(null)
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? students.filter((x) => x.name.toLowerCase().includes(s) || (x.pin_code ?? '').includes(s)) : students
  }, [students, q])

  return (
    <div className="space-y-5">
      {/* Quick links + settings */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <SettingsCard settings={settings} />
        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex flex-col gap-2">
          <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">StarBand screens</div>
          <a href={KIOSK} target="_blank" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 border border-zinc-200 rounded-lg px-3 py-2 hover:bg-zinc-50"><MonitorSmartphone size={15} /> Open reception kiosk</a>
          <a href="/starband/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 border border-zinc-200 rounded-lg px-3 py-2 hover:bg-zinc-50"><LayoutDashboard size={15} /> Who&apos;s checked in</a>
          <a href="/starband/register" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 border border-zinc-200 rounded-lg px-3 py-2 hover:bg-zinc-50"><Plus size={15} /> Register a band</a>
        </div>
      </div>

      {/* Students */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search child or PIN…" className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-900" />
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-100">
            <th className="px-4 py-3">Child</th><th className="px-3 py-3">Bands</th><th className="px-3 py-3">PIN</th><th className="px-3 py-3">Flags</th><th className="px-3 py-3"></th>
          </tr></thead>
          <tbody className="divide-y divide-zinc-50">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-zinc-50">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-zinc-100 overflow-hidden flex items-center justify-center text-[10px] font-bold text-zinc-500 shrink-0">
                      {s.photo_url ? <img src={s.photo_url} alt="" className="w-full h-full object-cover" /> : s.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="font-medium text-zinc-800">{s.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-zinc-600">{s.bands.length ? <span className="text-emerald-700 font-semibold">{s.bands.length} active</span> : <span className="text-zinc-400">none</span>}</td>
                <td className="px-3 py-2.5 tabular-nums text-zinc-600">{s.pin_code || <span className="text-zinc-300">—</span>}</td>
                <td className="px-3 py-2.5">
                  {(s.allergies || s.medical_notes) ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded"><AlertTriangle size={11} /> Medical</span> : <span className="text-zinc-300 text-xs">—</span>}
                </td>
                <td className="px-3 py-2.5 text-right"><button onClick={() => setEditing(s)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900"><Pencil size={14} /> Edit</button></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-400">No children match.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && <EditModal student={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function SettingsCard({ settings }: { settings: SBSettings }) {
  const router = useRouter()
  const [autoText, setAutoText] = useState(!!settings.auto_text)
  const [mode, setMode] = useState(settings.default_mode || 'tap')
  const [saved, setSaved] = useState(false)
  async function save(next: { auto_text?: boolean; mode?: string }) {
    await fetch('/api/starband/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
    setSaved(true); setTimeout(() => setSaved(false), 1500); router.refresh()
  }
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-zinc-900">StarBand settings</h3>{saved && <span className="text-xs text-emerald-600 font-medium">✓ Saved</span>}</div>
      <label className="flex items-center justify-between py-2 border-b border-zinc-50">
        <span className="text-sm text-zinc-700">Text parents on check-in / out</span>
        <input type="checkbox" checked={autoText} onChange={(e) => { setAutoText(e.target.checked); save({ auto_text: e.target.checked }) }} className="w-5 h-5" />
      </label>
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-zinc-700">Default check-in mode</span>
        <select value={mode} onChange={(e) => { setMode(e.target.value); save({ mode: e.target.value }) }} className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5">
          <option value="tap">Wristband tap</option><option value="faces">Face / photo</option><option value="pin">PIN</option>
        </select>
      </div>
      <p className="text-[11px] text-zinc-400 mt-1">These settings are per-business, so each franchise sets their own.</p>
    </div>
  )
}

function EditModal({ student, onClose }: { student: SBStudent; onClose: () => void }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const [f, setF] = useState({ pin_code: student.pin_code ?? '', photo_url: student.photo_url ?? '', allergies: student.allergies ?? '', medical_notes: student.medical_notes ?? '', authorised_pickup: student.authorised_pickup ?? '' })
  const [newBand, setNewBand] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const inp = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-900'
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))

  async function save() {
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/starband/student', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: student.id, ...f }) })
      if (!r.ok) throw new Error((await r.json()).error || 'Could not save')
      router.refresh(); onClose()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save') } finally { setBusy(false) }
  }
  async function assignBand() {
    if (!newBand.trim()) return
    setBusy(true)
    await fetch('/api/starband/student', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'assign_band', studentId: student.id, nfc_uid: newBand }) })
    setNewBand(''); router.refresh(); setBusy(false); onClose()
  }
  async function removeBand(tagId: string) {
    setBusy(true)
    await fetch('/api/starband/student', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deactivate_band', tagId }) })
    router.refresh(); setBusy(false); onClose()
  }

  if (!mounted) return null
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto text-left" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100"><h3 className="font-bold text-zinc-900">{student.name} · StarBand</h3><button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={18} /></button></div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="PIN (4 digits)"><input className={inp} value={f.pin_code} onChange={(e) => set('pin_code', e.target.value)} placeholder="1234" maxLength={6} /></Field>
            <Field label="Photo link"><input className={inp} value={f.photo_url} onChange={(e) => set('photo_url', e.target.value)} placeholder="https://…" /></Field>
          </div>
          <Field label="⚠️ Allergies"><input className={inp} value={f.allergies} onChange={(e) => set('allergies', e.target.value)} placeholder="e.g. Nuts, dairy" /></Field>
          <Field label="Medical notes"><input className={inp} value={f.medical_notes} onChange={(e) => set('medical_notes', e.target.value)} placeholder="e.g. Asthma — puffer in bag" /></Field>
          <Field label="Authorised pickup (who may collect)"><input className={inp} value={f.authorised_pickup} onChange={(e) => set('authorised_pickup', e.target.value)} placeholder="e.g. Mum (Sarah), Dad (Tom), Nan (Lyn)" /></Field>

          <div>
            <div className="text-xs font-semibold text-zinc-600 mb-1.5">Wristbands / tags</div>
            <div className="space-y-1.5 mb-2">
              {student.bands.length === 0 && <p className="text-xs text-zinc-400">No active bands.</p>}
              {student.bands.map((b) => (
                <div key={b.id} className="flex items-center gap-2 text-sm bg-zinc-50 rounded-lg px-3 py-1.5">
                  <span className="font-mono text-xs text-zinc-700 flex-1 truncate">{b.nfc_uid}</span>
                  <span className="text-[10px] text-zinc-400">{b.label || b.kind}</span>
                  <button onClick={() => removeBand(b.id)} disabled={busy} className="text-zinc-400 hover:text-red-600" title="Deactivate"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className={`${inp} flex-1`} value={newBand} onChange={(e) => setNewBand(e.target.value)} placeholder="Tap a band to read its code, or type it" />
              <button onClick={assignBand} disabled={busy || !newBand.trim()} className="bg-zinc-900 text-white text-sm font-semibold px-3 rounded-lg disabled:opacity-50">Add</button>
            </div>
          </div>

          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{err}</div>}
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-zinc-100">
          <button onClick={save} disabled={busy} className="bg-[#D72027] text-white font-semibold text-sm px-5 py-2.5 rounded-lg disabled:opacity-50 hover:bg-[#A0151B]">{busy ? 'Saving…' : 'Save'}</button>
          <button onClick={onClose} className="text-sm font-semibold text-zinc-500 hover:text-zinc-800">Cancel</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">{label}</label>{children}</div>
}
