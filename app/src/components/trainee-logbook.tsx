'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Check, Clock } from 'lucide-react'
import { TRAINEE_PATHWAY } from '@/lib/coaching-hub'

export type Trainee = { id: string; name: string; role: string | null; level: string | null; goals: string | null }
export type LogEntry = { id: string; coach_id: string; entry_date: string; time_in: string | null; time_out: string | null; hours: number; activity: string | null; signed_off: boolean }

const input = 'px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none'
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })

export function TraineeLogbook({ trainees, entries, canManage }: { trainees: Trainee[]; entries: LogEntry[]; canManage: boolean }) {
  const router = useRouter()
  const [selId, setSelId] = useState<string>(trainees[0]?.id ?? '')
  const sel = trainees.find((t) => t.id === selId)
  const myEntries = entries.filter((e) => e.coach_id === selId)
  const total = myEntries.reduce((a, e) => a + Number(e.hours || 0), 0)

  if (trainees.length === 0) return <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center text-sm text-zinc-500">No coaches yet. Add team members first (Team → Staff).</div>

  return (
    <div className="grid lg:grid-cols-[240px_1fr] gap-4">
      <div className="bg-white rounded-2xl border border-zinc-200 p-2 h-fit">
        {trainees.map((t) => (
          <button key={t.id} onClick={() => setSelId(t.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selId === t.id ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-50 text-zinc-700'}`}>
            <div className="font-semibold">{t.name}</div>
            <div className={`text-[11px] ${selId === t.id ? 'text-zinc-300' : 'text-zinc-400'}`}>{TRAINEE_PATHWAY.find((l) => l.key === t.level)?.title ?? (t.role ?? 'coach')}</div>
          </button>
        ))}
      </div>

      {sel && <Detail key={sel.id} trainee={sel} entries={myEntries} total={total} canManage={canManage} onChange={() => router.refresh()} />}
    </div>
  )
}

function Detail({ trainee, entries, total, canManage, onChange }: { trainee: Trainee; entries: LogEntry[]; total: number; canManage: boolean; onChange: () => void }) {
  const [level, setLevel] = useState(trainee.level ?? '')
  const [goals, setGoals] = useState(trainee.goals ?? '')
  const [savingP, setSavingP] = useState(false)
  const [f, setF] = useState({ entry_date: '', time_in: '', time_out: '', activity: '', signed_off: false })
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))

  async function saveProfile() {
    setSavingP(true)
    try { await fetch('/api/coaches', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: trainee.id, trainee_level: level || null, trainee_goals: goals || null }) }); onChange() } finally { setSavingP(false) }
  }
  async function addEntry() {
    if (!f.entry_date) return
    setBusy(true)
    try { await fetch('/api/trainee-logbook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ coach_id: trainee.id, ...f }) }); setF({ entry_date: '', time_in: '', time_out: '', activity: '', signed_off: false }); onChange() } finally { setBusy(false) }
  }
  async function del(id: string) { await fetch(`/api/trainee-logbook?id=${id}`, { method: 'DELETE' }); onChange() }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-zinc-200 p-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-extrabold text-zinc-900 text-lg">{trainee.name}</h2>
          <span className="text-sm font-extrabold text-[#D72027] inline-flex items-center gap-1"><Clock size={14} /> {total.toFixed(1)} hrs logged</span>
        </div>
        {canManage && (
          <div className="grid sm:grid-cols-2 gap-4 mt-3">
            <label className="block"><span className="text-xs font-semibold text-zinc-600">Trainee level</span>
              <select className={`${input} w-full`} value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="">— not set —</option>
                {TRAINEE_PATHWAY.map((l) => <option key={l.key} value={l.key}>{l.title} ({l.pay})</option>)}
              </select>
            </label>
            <label className="block"><span className="text-xs font-semibold text-zinc-600">Goals</span><input className={`${input} w-full`} value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="This term's goals" /></label>
            <div><button onClick={saveProfile} disabled={savingP} className="bg-zinc-900 text-white font-semibold text-sm px-4 py-2 rounded-lg disabled:opacity-50">{savingP ? 'Saving…' : 'Save level & goals'}</button></div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 p-5">
        <h3 className="font-extrabold text-zinc-900 mb-3">Hours logbook</h3>
        {canManage && (
          <div className="flex flex-wrap items-end gap-2 mb-4 bg-zinc-50 rounded-xl p-3">
            <label className="flex flex-col"><span className="text-[10px] font-bold uppercase text-zinc-500">Date</span><input type="date" className={input} value={f.entry_date} onChange={(e) => set('entry_date', e.target.value)} /></label>
            <label className="flex flex-col"><span className="text-[10px] font-bold uppercase text-zinc-500">In</span><input type="time" className={input} value={f.time_in} onChange={(e) => set('time_in', e.target.value)} /></label>
            <label className="flex flex-col"><span className="text-[10px] font-bold uppercase text-zinc-500">Out</span><input type="time" className={input} value={f.time_out} onChange={(e) => set('time_out', e.target.value)} /></label>
            <label className="flex flex-col flex-1 min-w-[140px]"><span className="text-[10px] font-bold uppercase text-zinc-500">What they coached</span><input className={input} value={f.activity} onChange={(e) => set('activity', e.target.value)} placeholder="e.g. Mon acro warm-up" /></label>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 pb-2"><input type="checkbox" checked={f.signed_off} onChange={(e) => setF((p) => ({ ...p, signed_off: e.target.checked }))} /> Signed off</label>
            <button onClick={addEntry} disabled={busy} className="bg-[#D72027] text-white font-semibold text-sm px-4 py-2 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5"><Plus size={14} /> Add</button>
          </div>
        )}
        {entries.length === 0 ? <p className="text-sm text-zinc-400 italic py-4 text-center">No hours logged yet.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr><th className="py-2">Date</th><th className="py-2">In–Out</th><th className="py-2 text-right">Hrs</th><th className="py-2">Coached</th><th className="py-2 text-center">✓</th>{canManage && <th></th>}</tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="py-2">{fmtDate(e.entry_date)}</td>
                  <td className="py-2 text-zinc-500">{e.time_in?.slice(0, 5) ?? '—'}{e.time_out ? `–${e.time_out.slice(0, 5)}` : ''}</td>
                  <td className="py-2 text-right font-bold">{Number(e.hours).toFixed(1)}</td>
                  <td className="py-2 text-zinc-600">{e.activity ?? ''}</td>
                  <td className="py-2 text-center">{e.signed_off ? <Check size={14} className="text-emerald-500 inline" /> : <span className="text-zinc-300">—</span>}</td>
                  {canManage && <td className="py-2 text-right"><button onClick={() => del(e.id)} className="text-zinc-300 hover:text-red-600"><Trash2 size={14} /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
