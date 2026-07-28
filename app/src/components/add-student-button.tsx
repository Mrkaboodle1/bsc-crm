'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, X } from 'lucide-react'

export function AddStudentButton({ families }: { families: { id: string; name: string }[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [f, setF] = useState({ family_id: '', first_name: '', last_name: '', date_of_birth: '' })
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))

  async function save() {
    if (!f.first_name.trim()) { setErr('Enter the child’s first name'); return }
    if (!f.family_id) { setErr('Pick which family they belong to'); return }
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'Could not add') }
      setOpen(false); setF({ family_id: '', first_name: '', last_name: '', date_of_birth: '' }); router.refresh()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Error'); setBusy(false) }
  }

  const inp = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none'
  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 bg-[#D72027] hover:bg-[#A0151B] text-white font-bold text-sm px-4 py-2.5 rounded-lg"><UserPlus size={16} /> Add student</button>
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-zinc-100"><h3 className="font-extrabold text-zinc-900">Add a student</h3><button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-700"><X size={20} /></button></div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="text-xs font-semibold text-zinc-600">First name *</span><input className={inp} value={f.first_name} onChange={(e) => set('first_name', e.target.value)} autoFocus /></label>
                <label className="block"><span className="text-xs font-semibold text-zinc-600">Last name</span><input className={inp} value={f.last_name} onChange={(e) => set('last_name', e.target.value)} /></label>
              </div>
              <label className="block"><span className="text-xs font-semibold text-zinc-600">Birthday</span><input type="date" className={inp} value={f.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} /></label>
              <label className="block"><span className="text-xs font-semibold text-zinc-600">Family *</span>
                <select className={inp} value={f.family_id} onChange={(e) => set('family_id', e.target.value)}>
                  <option value="">Choose a family…</option>
                  {families.map((fam) => <option key={fam.id} value={fam.id}>{fam.name}</option>)}
                </select>
                <span className="text-[11px] text-zinc-400">No family yet? Add the parent under Contacts first, then add the child here or on their page.</span>
              </label>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={save} disabled={busy} className="bg-[#D72027] text-white font-semibold text-sm px-5 py-2.5 rounded-lg disabled:opacity-50">{busy ? 'Adding…' : 'Add student'}</button>
                <button onClick={() => setOpen(false)} className="text-sm font-semibold text-zinc-500 px-4">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
