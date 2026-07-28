'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateStudent, deleteStudent, reassignStudentFamily, searchFamiliesForStudent } from '@/app/students/[id]/actions'

type Fam = { id: string; name: string; parent: string | null; email: string | null }

export function StudentAdminPanel({
  student,
  canDelete,
}: {
  student: { id: string; firstName: string; lastName: string | null; dob: string | null; medical: string | null; familyName: string | null }
  canDelete: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [f, setF] = useState({
    firstName: student.firstName,
    lastName: student.lastName ?? '',
    dob: student.dob ?? '',
    medical: student.medical ?? '',
  })
  // family reassign
  const [famQuery, setFamQuery] = useState('')
  const [famResults, setFamResults] = useState<Fam[]>([])
  const [famBusy, setFamBusy] = useState(false)

  const inp = 'w-full px-3 py-2 border-2 border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none'

  async function save() {
    setBusy(true); setError(null); setSaved(false)
    const r = await updateStudent({ id: student.id, firstName: f.firstName, lastName: f.lastName || null, dob: f.dob || null, medical: f.medical || null })
    setBusy(false)
    if (!r.ok) { setError(r.error); return }
    setSaved(true); router.refresh()
    setTimeout(() => setSaved(false), 1800)
  }

  async function doSearchFam(q: string) {
    setFamQuery(q)
    if (q.trim().length < 2) { setFamResults([]); return }
    setFamBusy(true)
    const r = await searchFamiliesForStudent({ query: q })
    setFamBusy(false)
    if (r.ok) setFamResults(r.results)
  }

  async function pickFamily(fam: Fam) {
    if (!confirm(`Move ${f.firstName} into the ${fam.name} family (${fam.parent ?? fam.email ?? ''})?`)) return
    setBusy(true)
    const r = await reassignStudentFamily({ id: student.id, familyId: fam.id })
    setBusy(false)
    if (!r.ok) { setError(r.error); return }
    setFamQuery(''); setFamResults([]); router.refresh()
  }

  async function doDelete() {
    if (!confirm(`Delete ${f.firstName} ${f.lastName} permanently? This removes the student record, their enrolments, attendance and stars. This cannot be undone.`)) return
    if (!confirm('Really delete? Only do this for a genuine duplicate — a real child would be lost from every roll.')) return
    setBusy(true)
    const r = await deleteStudent({ id: student.id })
    setBusy(false)
    if (!r.ok) { setError(r.error); return }
    router.push('/students')
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-white border-2 border-zinc-300 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:border-[#D72027] hover:text-[#D72027]"
      >
        ✏️ Edit / fix this student
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-extrabold text-zinc-900">Edit student</h3>
          {saved && <span className="text-xs font-bold text-emerald-600">Saved ✓</span>}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">First name *</label>
              <input className={inp} value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">Last name</label>
              <input className={inp} value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">Date of birth</label>
            <input type="date" className={inp} value={f.dob} onChange={(e) => setF({ ...f, dob: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">⚕ Medical notes</label>
            <textarea rows={2} className={inp + ' resize-none'} placeholder="Allergies, asthma, etc." value={f.medical} onChange={(e) => setF({ ...f, medical: e.target.value })} />
          </div>

          <button onClick={save} disabled={busy} className="w-full bg-[#D72027] text-white font-extrabold text-sm py-2.5 rounded-lg hover:bg-[#A0151B] disabled:opacity-50">
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        {/* Reassign to the correct family */}
        <div className="mt-5 border-t border-zinc-200 pt-4">
          <label className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">Wrong family? Move {f.firstName} to…</label>
          <div className="text-xs text-zinc-500 mb-2">Currently: <strong>{student.familyName ?? '—'}</strong></div>
          <input className={inp} placeholder="Search a parent / family name or email…" value={famQuery} onChange={(e) => doSearchFam(e.target.value)} />
          {famBusy && <div className="text-xs text-zinc-400 mt-1 italic">Searching…</div>}
          {famResults.length > 0 && (
            <ul className="mt-2 border border-zinc-200 rounded-lg divide-y divide-zinc-100 max-h-44 overflow-y-auto">
              {famResults.map((fam) => (
                <li key={fam.id}>
                  <button onClick={() => pickFamily(fam)} className="w-full text-left px-3 py-2 hover:bg-amber-50">
                    <div className="font-bold text-sm text-zinc-900">{fam.name}</div>
                    <div className="text-[10px] text-zinc-500">{fam.parent ?? ''}{fam.email ? ` · ${fam.email}` : ''}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <div className="mt-3 text-sm text-red-700 bg-red-50 px-3 py-2 rounded">{error}</div>}

        <div className="mt-5 flex items-center justify-between border-t border-zinc-200 pt-4">
          {canDelete ? (
            <button onClick={doDelete} disabled={busy} className="text-sm font-extrabold text-red-600 hover:text-red-700 disabled:opacity-50">
              🗑 Delete student
            </button>
          ) : <span />}
          <button onClick={() => setOpen(false)} className="text-sm font-bold text-zinc-600 px-3 py-2 rounded-lg hover:bg-zinc-100">Close</button>
        </div>
      </div>
    </div>
  )
}
