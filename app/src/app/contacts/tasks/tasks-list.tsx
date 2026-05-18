'use client'

import { useState, useTransition } from 'react'
import { createTask, deleteTask, setTaskStatus } from './actions'

export type TaskRow = {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueAt: string | null
  familyId: string | null
  familyName: string | null
  primaryParent: string | null
}

const PRIORITY_CLS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-900',
  high:   'bg-amber-100 text-amber-900',
  normal: 'bg-zinc-100 text-zinc-700',
  low:    'bg-zinc-50 text-zinc-500',
}

function dueLabel(iso: string | null): { label: string; cls: string } {
  if (!iso) return { label: 'No due date', cls: 'text-zinc-400' }
  const due = new Date(iso)
  const diff = due.getTime() - Date.now()
  const days = Math.floor(diff / 86400_000)
  if (diff < 0) {
    const absDays = Math.abs(days)
    return { label: `${absDays === 0 ? 'Today' : `${absDays}d`} overdue`, cls: 'text-red-700 font-bold' }
  }
  if (days === 0) return { label: 'Due today', cls: 'text-amber-700 font-bold' }
  if (days === 1) return { label: 'Due tomorrow', cls: 'text-amber-600' }
  if (days < 7) return { label: `Due in ${days}d`, cls: 'text-zinc-700' }
  return { label: due.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }), cls: 'text-zinc-600' }
}

export function TasksList({ rows: initial }: { rows: TaskRow[] }) {
  const [rows, setRows] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [pri, setPri] = useState<'urgent' | 'high' | 'normal' | 'low'>('normal')
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function addNew() {
    if (!title.trim()) return
    setError(null)
    startTransition(async () => {
      const res = await createTask({
        title: title.trim(),
        due_at: due ? new Date(`${due}T09:00:00+10:00`).toISOString() : null,
        priority: pri,
      })
      if (!res.ok) { setError(res.error); return }
      setTitle(''); setDue(''); setPri('normal'); setAdding(false)
      window.location.reload()
    })
  }

  function toggle(t: TaskRow) {
    const next = t.status === 'done' ? 'open' : 'done'
    setRows((rs) => rs.map((r) => (r.id === t.id ? { ...r, status: next } : r)))
    startTransition(async () => {
      const res = await setTaskStatus({ id: t.id, status: next })
      if (!res.ok) {
        setRows((rs) => rs.map((r) => (r.id === t.id ? { ...r, status: t.status } : r)))
        alert(res.error)
      }
    })
  }

  function remove(t: TaskRow) {
    if (!confirm(`Delete task "${t.title}"?`)) return
    setRows((rs) => rs.filter((r) => r.id !== t.id))
    startTransition(async () => {
      const res = await deleteTask({ id: t.id })
      if (!res.ok) alert(res.error)
    })
  }

  return (
    <div className="space-y-3">
      {/* Add task */}
      {adding ? (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-[#D72027] p-4 space-y-2">
          <input
            type="text"
            placeholder="What needs doing?"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-sm font-bold focus:border-[#D72027] focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && addNew()}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Due</label>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="px-2 py-1.5 border-2 border-zinc-200 rounded-lg text-xs" />
            <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Priority</label>
            <select value={pri} onChange={(e) => setPri(e.target.value as 'urgent' | 'high' | 'normal' | 'low')} className="px-2 py-1.5 border-2 border-zinc-200 rounded-lg text-xs font-bold">
              <option value="urgent">🔥 Urgent</option>
              <option value="high">⚡ High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <div className="ml-auto flex gap-1">
              <button onClick={() => { setAdding(false); setTitle(''); setError(null) }} className="text-xs font-bold text-zinc-500 px-3 py-1.5 rounded-lg hover:bg-zinc-100">Cancel</button>
              <button onClick={addNew} disabled={!title.trim()} className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-xs px-3 py-1.5 rounded-lg disabled:opacity-50">+ Create task</button>
            </div>
          </div>
          {error && <div className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded">{error}</div>}
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full bg-white border-2 border-dashed border-zinc-300 hover:border-[#D72027] hover:bg-red-50 text-zinc-500 hover:text-[#D72027] font-extrabold text-sm px-4 py-3 rounded-2xl"
        >
          + Add task
        </button>
      )}

      {/* List */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-10 text-center">
          <div className="text-5xl mb-3">✅</div>
          <p className="font-bold text-zinc-700">No tasks here.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((t) => {
            const isDone = t.status === 'done'
            const dl = dueLabel(t.dueAt)
            return (
              <li key={t.id} className={`bg-white rounded-xl shadow-sm border-2 p-3 flex items-start gap-3 ${isDone ? 'border-zinc-100 opacity-60' : 'border-zinc-200'}`}>
                <button onClick={() => toggle(t)} className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center ${isDone ? 'bg-emerald-500 border-emerald-600 text-white' : 'border-zinc-300 hover:border-[#D72027]'}`} aria-label="Toggle done">
                  {isDone && '✓'}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold ${isDone ? 'line-through text-zinc-500' : 'text-zinc-900'}`}>
                    {t.title}
                  </div>
                  {t.description && <div className="text-xs text-zinc-600 mt-0.5 line-clamp-2">{t.description}</div>}
                  <div className="text-[11px] mt-1.5 flex items-center gap-2 flex-wrap">
                    {!isDone && <span className={dl.cls}>{dl.label}</span>}
                    {t.familyId && (
                      <a href={`/contacts/${t.familyId}`} className="text-zinc-500 hover:text-[#D72027] hover:underline">
                        · {t.primaryParent ?? t.familyName}
                      </a>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${PRIORITY_CLS[t.priority] ?? 'bg-zinc-100'}`}>
                  {t.priority}
                </span>
                <button onClick={() => remove(t)} className="text-zinc-300 hover:text-red-600 text-base leading-none" aria-label="Delete">×</button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
