'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, X, Pencil, Trash2, Download, Send, FileText } from 'lucide-react'
import { StudentMedia } from '@/components/student-media'
import { ParentContact } from '@/components/parent-contact'
import { VoiceTextarea } from '@/components/voice-textarea'

export type StudentLite = { id: string; name: string }
type Plan = { id: string; student_id: string; date: string; title: string | null; did: string | null; progress: string | null; next_focus: string | null }

const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const inp = 'w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#D72027]'

export function LessonPlansClient({ students, initialStudentId }: { students: StudentLite[]; initialStudentId?: string }) {
  const [q, setQ] = useState('')
  const [student, setStudent] = useState<StudentLite | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [adding, setAdding] = useState(false)
  const [sending, setSending] = useState<string | null>(null)

  const matches = q.trim().length >= 1 ? students.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8) : []

  // If we arrived from a roll/student link (?student=…), open that child straight away.
  useEffect(() => {
    if (!initialStudentId) return
    const s = students.find((x) => x.id === initialStudentId)
    if (s) openStudent(s)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStudentId])

  async function openStudent(s: StudentLite) {
    setStudent(s); setQ(''); setLoading(true)
    const r = await fetch(`/api/lesson-plans?student_id=${s.id}`)
    const j = await r.json(); setLoading(false)
    setPlans(j.ok ? j.rows : [])
  }
  async function del(id: string) {
    if (!confirm('Delete this lesson plan?')) return
    setPlans((xs) => xs.filter((x) => x.id !== id))
    fetch(`/api/lesson-plans?id=${id}`, { method: 'DELETE' }).catch(() => {})
  }
  async function emailParent(id: string) {
    setSending(id)
    const r = await fetch('/api/lesson-plans/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    const j = await r.json(); setSending(null)
    alert(j.ok ? `Sent to ${j.to} ✓` : (j.error || 'Could not send'))
  }
  function onSaved(p: Plan, isNew: boolean) {
    setPlans((xs) => isNew ? [p, ...xs].sort((a, b) => b.date.localeCompare(a.date)) : xs.map((x) => x.id === p.id ? p : x))
    setAdding(false); setEditing(null)
  }

  return (
    <div className="space-y-4">
      {/* student picker */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-4">
        <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-2">Find a student</div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a child's name…" className={inp + ' pl-9'} />
          {matches.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden">
              {matches.map((s) => <button key={s.id} onClick={() => openStudent(s)} className="block w-full text-left px-3 py-2 text-sm hover:bg-zinc-50">{s.name}</button>)}
            </div>
          )}
        </div>
      </div>

      {student && (
        <>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-extrabold text-zinc-900 text-lg">{student.name}</h3>
            <button onClick={() => setAdding(true)} className="inline-flex items-center gap-2 bg-[#D72027] text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-[#A0151B]"><Plus size={16} /> New lesson plan</button>
          </div>

          {/* Editable parent contact (fix mum/dad's phone or email here) */}
          <ParentContact studentId={student.id} />

          {/* Photos & videos for technique review */}
          <StudentMedia studentId={student.id} />

          {loading ? <p className="text-sm text-zinc-400">Loading…</p> : plans.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-sm text-zinc-500"><FileText size={24} className="mx-auto text-zinc-300 mb-2" />No lesson plans yet for {student.name}. Tap “New lesson plan”.</div>
          ) : (
            <ul className="space-y-2">
              {plans.map((p) => (
                <li key={p.id} className="bg-white rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-extrabold bg-zinc-100 text-zinc-700 px-2 py-1 rounded-lg">{fmtDate(p.date)}</span>
                    {p.title && <span className="font-bold text-zinc-800">{p.title}</span>}
                    <div className="flex-1" />
                    <a href={`/api/lesson-plans/pdf?id=${p.id}`} className="p-1.5 text-zinc-400 hover:text-zinc-800" title="Download PDF"><Download size={15} /></a>
                    <button onClick={() => emailParent(p.id)} disabled={sending === p.id} className="p-1.5 text-zinc-400 hover:text-emerald-600 disabled:opacity-50" title="Email to parent"><Send size={15} /></button>
                    <button onClick={() => setEditing(p)} className="p-1.5 text-zinc-400 hover:text-[#D72027]" title="Edit"><Pencil size={15} /></button>
                    <button onClick={() => del(p.id)} className="p-1.5 text-zinc-400 hover:text-red-600" title="Delete"><Trash2 size={15} /></button>
                  </div>
                  <Field label="What we worked on" value={p.did} />
                  <Field label="Progress" value={p.progress} />
                  <Field label="Next focus / homework" value={p.next_focus} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {(adding || editing) && student && (
        <PlanModal studentId={student.id} existing={editing} onClose={() => { setAdding(false); setEditing(null) }} onSaved={onSaved} />
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return <div className="mt-1.5"><span className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">{label}</span><p className="text-sm text-zinc-700 whitespace-pre-wrap">{value}</p></div>
}

function PlanModal({ studentId, existing, onClose, onSaved }: { studentId: string; existing: Plan | null; onClose: () => void; onSaved: (p: Plan, isNew: boolean) => void }) {
  const isEdit = !!existing
  const today = new Date().toISOString().slice(0, 10)
  const [f, setF] = useState({ date: existing?.date ?? today, title: existing?.title ?? '', did: existing?.did ?? '', progress: existing?.progress ?? '', next_focus: existing?.next_focus ?? '' })
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  async function save() {
    if (!f.date) { setErr('Pick a date'); return }
    setBusy(true); setErr('')
    const r = await fetch('/api/lesson-plans', { method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(isEdit ? { id: existing!.id, ...f } : { student_id: studentId, ...f }) })
    const j = await r.json()
    if (!r.ok) { setErr(j.error || 'Could not save'); setBusy(false); return }
    onSaved({ id: isEdit ? existing!.id : j.id, student_id: studentId, date: f.date, title: f.title || null, did: f.did || null, progress: f.progress || null, next_focus: f.next_focus || null }, !isEdit)
  }
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-100"><h3 className="font-extrabold text-zinc-900">{isEdit ? 'Edit lesson plan' : 'New lesson plan'}</h3><button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={20} /></button></div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-xs font-semibold text-zinc-600">Date</span><input type="date" className={inp} value={f.date} onChange={(e) => set('date', e.target.value)} /></label>
            <label className="block"><span className="text-xs font-semibold text-zinc-600">Title (optional)</span><input className={inp} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Aerial silks" /></label>
          </div>
          <div><span className="text-xs font-semibold text-zinc-600">What we worked on</span><VoiceTextarea rows={3} value={f.did} onChange={(v) => set('did', v)} placeholder="Skills, drills, what you covered…" /></div>
          <div><span className="text-xs font-semibold text-zinc-600">Progress</span><VoiceTextarea rows={2} value={f.progress} onChange={(v) => set('progress', v)} placeholder="How they're going, wins, things clicking…" /></div>
          <div><span className="text-xs font-semibold text-zinc-600">Next focus / homework</span><VoiceTextarea rows={2} value={f.next_focus} onChange={(v) => set('next_focus', v)} placeholder="What to work on next / at home…" /></div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button onClick={onClose} className="text-sm font-semibold text-zinc-500 px-3 py-2.5">Cancel</button>
            <button onClick={save} disabled={busy} className="bg-[#D72027] text-white font-extrabold text-sm px-6 py-3 rounded-xl disabled:opacity-50">{busy ? 'Saving…' : isEdit ? 'Save' : 'Save plan'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
