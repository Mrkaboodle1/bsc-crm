'use client'

import { useEffect, useState } from 'react'
import { Printer, Plus, Trash2, ArrowLeft, Check, Pencil } from 'lucide-react'

type Item = { q: string; answer: string; score: number | null }
type Interview = {
  id?: string
  candidate_name: string
  role_type: string | null
  interview_date: string | null
  start_time: string | null
  interviewer: string | null
  items: Item[]
  decision: string | null
  notes: string | null
  status: string
  created_at?: string
}
type Template = { id: string; name: string; questions: string[] }

const inp = 'w-full px-3 py-2 border-2 border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none'
const lbl = 'text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1 block'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function InterviewLog() {
  const [view, setView] = useState<'list' | 'edit' | 'templates'>('list')
  const [list, setList] = useState<Interview[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [current, setCurrent] = useState<Interview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/interviews').then((r) => r.json()).catch(() => ({})),
      fetch('/api/interview-templates').then((r) => r.json()).catch(() => ({})),
    ]).then(([iv, tp]) => {
      setList(iv.rows ?? [])
      setTemplates(tp.rows ?? [])
      setLoading(false)
    })
  }, [])

  function newInterview(tpl?: Template) {
    setCurrent({
      candidate_name: '', role_type: tpl?.name ?? '', interview_date: todayISO(), start_time: '',
      interviewer: '', items: (tpl?.questions ?? []).map((q) => ({ q, answer: '', score: null })),
      decision: null, notes: null, status: 'draft',
    })
    setView('edit')
  }

  if (loading) return <div className="text-center py-12 text-zinc-400">Loading your interview log…</div>

  if (view === 'templates') return <Templates templates={templates} setTemplates={setTemplates} onBack={() => setView('list')} />
  if (view === 'edit' && current) return (
    <Editor
      value={current} templates={templates}
      onBack={() => { setView('list'); setCurrent(null) }}
      onSaved={(saved) => {
        setList((l) => { const i = l.findIndex((x) => x.id === saved.id); if (i >= 0) { const c = [...l]; c[i] = saved; return c } return [saved, ...l] })
        setCurrent(saved)
      }}
      onDeleted={(id) => { setList((l) => l.filter((x) => x.id !== id)); setView('list'); setCurrent(null) }}
    />
  )

  // LIST
  return (
    <div className="space-y-4">
      <div className="bg-[#D72027]/5 border border-[#D72027]/15 rounded-xl px-4 py-3 text-sm text-zinc-700">
        Run every interview on your iPad — pick a question set, fill it in, and it&apos;s saved here to look back on. Nothing to print unless you want to.
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {templates.map((t) => (
          <button key={t.id} onClick={() => newInterview(t)} className="inline-flex items-center gap-1.5 bg-[#D72027] hover:bg-[#A0151B] text-white font-bold text-sm px-3.5 py-2 rounded-lg"><Plus size={15} /> New {t.name} interview</button>
        ))}
        <button onClick={() => newInterview()} className="inline-flex items-center gap-1.5 border-2 border-zinc-300 text-zinc-700 font-bold text-sm px-3.5 py-2 rounded-lg hover:border-zinc-400"><Plus size={15} /> Blank</button>
        <button onClick={() => setView('templates')} className="ml-auto inline-flex items-center gap-1.5 text-zinc-600 font-semibold text-sm px-3 py-2 rounded-lg hover:bg-zinc-100"><Pencil size={14} /> Question templates</button>
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-10 text-center text-zinc-500">
          <div className="text-4xl mb-2">📋</div>No interviews logged yet. Start one above.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100">
          {list.map((iv) => (
            <button key={iv.id} onClick={() => { setCurrent({ ...iv, items: iv.items ?? [] }); setView('edit') }} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-50/40">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-zinc-900 truncate">{iv.candidate_name} <span className="text-xs font-normal text-zinc-400">· {iv.role_type || 'Interview'}</span></div>
                <div className="text-xs text-zinc-500">{iv.interview_date || '—'}{iv.start_time ? ` · ${iv.start_time}` : ''}</div>
              </div>
              {iv.decision && <span className="text-[10px] font-black uppercase px-2 py-1 rounded bg-zinc-100 text-zinc-600">{iv.decision}</span>}
              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${iv.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{iv.status}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Editor({ value, templates, onBack, onSaved, onDeleted }: {
  value: Interview; templates: Template[]
  onBack: () => void; onSaved: (i: Interview) => void; onDeleted: (id: string) => void
}) {
  const [iv, setIv] = useState<Interview>(value)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState(false)
  const set = (k: keyof Interview, v: unknown) => setIv((p) => ({ ...p, [k]: v }))
  const setItem = (i: number, k: keyof Item, v: unknown) => setIv((p) => ({ ...p, items: p.items.map((it, x) => x === i ? { ...it, [k]: v } : it) }))
  const total = iv.items.reduce((n, it) => n + (it.score ?? 0), 0)
  const maxTotal = iv.items.filter((it) => it.score !== null).length * 5

  async function save(status: string) {
    if (!iv.candidate_name.trim()) { setError('Enter the candidate’s name'); return }
    setBusy(true); setError(null)
    const method = iv.id ? 'PATCH' : 'POST'
    const res = await fetch('/api/interviews', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...iv, status }) })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(j.error || 'Could not save'); return }
    setIv(j.row); onSaved(j.row); setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2000)
  }
  async function del() {
    if (!iv.id) { onBack(); return }
    if (!confirm('Delete this interview log permanently?')) return
    await fetch(`/api/interviews?id=${iv.id}`, { method: 'DELETE' })
    onDeleted(iv.id)
  }

  return (
    <div>
      <style>{`@media print { .no-print{display:none!important} textarea,input,select{border:none!important;padding:0!important} }`}</style>
      <div className="flex items-center gap-2 mb-4 no-print flex-wrap">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-bold text-zinc-600 hover:bg-zinc-100 px-2 py-2 rounded-lg"><ArrowLeft size={16} /> All interviews</button>
        <div className="ml-auto flex items-center gap-2">
          {savedMsg && <span className="text-sm font-bold text-emerald-600">Saved ✓</span>}
          <button onClick={() => save('draft')} disabled={busy} className="border border-zinc-300 text-zinc-700 font-bold text-sm px-3 py-2 rounded-lg hover:bg-zinc-50 disabled:opacity-50">Save draft</button>
          <button onClick={() => save('completed')} disabled={busy} className="inline-flex items-center gap-1.5 bg-emerald-600 text-white font-bold text-sm px-3.5 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"><Check size={15} /> Save &amp; complete</button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 border border-zinc-300 text-zinc-700 font-bold text-sm px-3 py-2 rounded-lg hover:bg-zinc-50"><Printer size={15} /> PDF</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-7 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">📋</span>
          <h2 className="text-xl font-black text-zinc-900">Interview log</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          <div><label className={lbl}>Candidate *</label><input className={inp} value={iv.candidate_name} onChange={(e) => set('candidate_name', e.target.value)} placeholder="e.g. Tiffany Buckley" /></div>
          <div><label className={lbl}>Role / type</label>
            <input className={inp} list="roletypes" value={iv.role_type ?? ''} onChange={(e) => set('role_type', e.target.value)} placeholder="Coach / Admin / Volunteer…" />
            <datalist id="roletypes">{templates.map((t) => <option key={t.id} value={t.name} />)}</datalist>
          </div>
          <div><label className={lbl}>Date</label><input type="date" className={inp} value={iv.interview_date ?? ''} onChange={(e) => set('interview_date', e.target.value)} /></div>
          <div><label className={lbl}>Start time</label><input className={inp} value={iv.start_time ?? ''} onChange={(e) => set('start_time', e.target.value)} placeholder="9:15am" /></div>
          <div className="sm:col-span-2"><label className={lbl}>Interviewer</label><input className={inp} value={iv.interviewer ?? ''} onChange={(e) => set('interviewer', e.target.value)} placeholder="Rhett" /></div>
        </div>

        <div className="text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-2">Questions &amp; answers</div>
        <div className="space-y-4">
          {iv.items.map((it, i) => (
            <div key={i} className="border border-zinc-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <span className="text-sm font-black text-[#D72027] mt-2">{i + 1}</span>
                <textarea className={inp + ' font-bold resize-none'} rows={2} value={it.q} onChange={(e) => setItem(i, 'q', e.target.value)} placeholder="Question…" />
                <button onClick={() => set('items', iv.items.filter((_, x) => x !== i))} className="no-print text-zinc-300 hover:text-red-500 mt-1.5"><Trash2 size={16} /></button>
              </div>
              <textarea className={inp + ' mt-2 resize-y'} rows={2} value={it.answer} onChange={(e) => setItem(i, 'answer', e.target.value)} placeholder="Type their answer / your notes…" />
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs font-bold text-zinc-500 mr-1">Score:</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setItem(i, 'score', it.score === n ? null : n)} className={`w-8 h-8 rounded-lg text-sm font-black ${it.score === n ? 'bg-amber-400 text-zinc-900' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'}`}>{n}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => set('items', [...iv.items, { q: '', answer: '', score: null }])} className="no-print mt-3 text-sm font-bold text-[#D72027] hover:underline inline-flex items-center gap-1"><Plus size={14} /> Add a question</button>

        <div className="mt-6 grid sm:grid-cols-2 gap-4 border-t border-zinc-200 pt-5">
          <div>
            <label className={lbl}>Decision</label>
            <div className="flex gap-2">
              {['Hire', 'Trial shift', 'Pass'].map((d) => (
                <button key={d} onClick={() => set('decision', iv.decision === d ? null : d)} className={`text-sm font-bold px-3 py-2 rounded-lg border-2 ${iv.decision === d ? 'bg-zinc-900 border-zinc-900 text-white' : 'border-zinc-200 text-zinc-600'}`}>{d}</button>
              ))}
            </div>
          </div>
          <div className="text-right">
            <label className={lbl}>Total score</label>
            <div className="text-2xl font-black text-[#D72027]">{total}{maxTotal > 0 && <span className="text-base text-zinc-400"> / {maxTotal}</span>}</div>
          </div>
        </div>
        <div className="mt-3"><label className={lbl}>Overall notes / reflection</label><textarea className={inp + ' resize-y'} rows={3} value={iv.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="Gut feel, standout moments, follow-ups…" /></div>

        {error && <div className="mt-3 text-sm text-red-700 bg-red-50 px-3 py-2 rounded">{error}</div>}
        {iv.id && <button onClick={del} className="no-print mt-5 text-sm font-bold text-red-600 hover:text-red-700 inline-flex items-center gap-1"><Trash2 size={14} /> Delete this log</button>}
      </div>
    </div>
  )
}

function Templates({ templates, setTemplates, onBack }: { templates: Template[]; setTemplates: (t: Template[]) => void; onBack: () => void }) {
  const [editing, setEditing] = useState<Template | null>(null)
  const [busy, setBusy] = useState(false)

  async function saveTpl(t: Template) {
    setBusy(true)
    const res = await fetch('/api/interview-templates', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (res.ok) {
      setTemplates(templates.some((x) => x.id === j.row.id) ? templates.map((x) => x.id === j.row.id ? j.row : x) : [...templates, j.row])
      setEditing(null)
    }
  }

  if (editing) {
    const t = editing
    return (
      <div className="max-w-2xl mx-auto">
        <button onClick={() => setEditing(null)} className="inline-flex items-center gap-1 text-sm font-bold text-zinc-600 mb-3"><ArrowLeft size={16} /> Templates</button>
        <div className="bg-white rounded-2xl border border-zinc-200 p-5">
          <label className={lbl}>Template name</label>
          <input className={inp + ' mb-4'} value={t.name} onChange={(e) => setEditing({ ...t, name: e.target.value })} />
          <label className={lbl}>Questions</label>
          <div className="space-y-2">
            {t.questions.map((q, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-sm font-black text-[#D72027] mt-2.5">{i + 1}</span>
                <textarea className={inp + ' resize-none'} rows={2} value={q} onChange={(e) => setEditing({ ...t, questions: t.questions.map((x, y) => y === i ? e.target.value : x) })} />
                <button onClick={() => setEditing({ ...t, questions: t.questions.filter((_, y) => y !== i) })} className="text-zinc-300 hover:text-red-500 mt-2"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
          <button onClick={() => setEditing({ ...t, questions: [...t.questions, ''] })} className="mt-2 text-sm font-bold text-[#D72027] inline-flex items-center gap-1"><Plus size={14} /> Add question</button>
          <div className="mt-5 flex gap-2">
            <button onClick={() => saveTpl(editing)} disabled={busy} className="bg-emerald-600 text-white font-bold text-sm px-4 py-2 rounded-lg disabled:opacity-50">{busy ? 'Saving…' : 'Save template'}</button>
            <button onClick={() => setEditing(null)} className="text-sm font-semibold text-zinc-500 px-3">Cancel</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-bold text-zinc-600 mb-3"><ArrowLeft size={16} /> Interview log</button>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-black text-zinc-900">Question templates</h2>
        <button onClick={() => setEditing({ id: '', name: '', questions: [''] })} className="inline-flex items-center gap-1.5 bg-[#D72027] text-white font-bold text-sm px-3 py-2 rounded-lg"><Plus size={15} /> New template</button>
      </div>
      <div className="space-y-2">
        {templates.map((t) => (
          <button key={t.id} onClick={() => setEditing(t)} className="w-full flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 text-left hover:border-[#D72027]">
            <div className="flex-1"><div className="font-bold text-zinc-900">{t.name}</div><div className="text-xs text-zinc-500">{t.questions.length} questions</div></div>
            <Pencil size={15} className="text-zinc-400" />
          </button>
        ))}
      </div>
    </div>
  )
}
