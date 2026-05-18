'use client'

// Compact tasks panel for the contact detail page right rail.
// Lists this contact's open + recent done tasks, lets you add inline,
// toggle done, and delete. Reuses the global tasks/* server actions so
// the data model and revalidation are consistent.

import { useState, useTransition } from 'react'
import { createTask, deleteTask, setTaskStatus } from '../tasks/actions'

export type ContactTask = {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueAt: string | null
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high:   'bg-amber-500',
  normal: 'bg-zinc-300',
  low:    'bg-zinc-200',
}

function dueLabel(iso: string | null): { label: string; cls: string } {
  if (!iso) return { label: 'no date', cls: 'text-zinc-400' }
  const due = new Date(iso)
  const diff = due.getTime() - Date.now()
  const days = Math.floor(diff / 86400_000)
  if (diff < 0) {
    const absDays = Math.abs(days)
    return { label: `${absDays === 0 ? 'today' : `${absDays}d`} overdue`, cls: 'text-red-700 font-extrabold' }
  }
  if (days === 0) return { label: 'today', cls: 'text-amber-700 font-bold' }
  if (days === 1) return { label: 'tomorrow', cls: 'text-amber-600 font-bold' }
  if (days < 7) return { label: `in ${days}d`, cls: 'text-zinc-700' }
  return { label: due.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }), cls: 'text-zinc-600' }
}

export function ContactTasksPanel({
  contactId,
  initial,
  tableMissing,
}: {
  contactId: string
  initial: ContactTask[]
  tableMissing: boolean
}) {
  const [rows, setRows] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [pri, setPri] = useState<'urgent' | 'high' | 'normal' | 'low'>('normal')
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const open = rows.filter((r) => r.status !== 'done' && r.status !== 'cancelled')
  const done = rows.filter((r) => r.status === 'done').slice(0, 3)

  function addNew() {
    if (!title.trim()) return
    setError(null)
    startTransition(async () => {
      const res = await createTask({
        title: title.trim(),
        due_at: due ? new Date(`${due}T09:00:00+10:00`).toISOString() : null,
        priority: pri,
        related_family_id: contactId,
      })
      if (!res.ok) { setError(res.error); return }
      // Optimistic insert — full reload would lose composer state.
      setRows((rs) => [
        {
          id: res.id ?? `tmp-${Date.now()}`,
          title: title.trim(),
          description: null,
          status: 'open',
          priority: pri,
          dueAt: due ? new Date(`${due}T09:00:00+10:00`).toISOString() : null,
        },
        ...rs,
      ])
      setTitle(''); setDue(''); setPri('normal'); setAdding(false)
    })
  }

  function toggle(t: ContactTask) {
    const next = t.status === 'done' ? 'open' : 'done'
    setRows((rs) => rs.map((r) => (r.id === t.id ? { ...r, status: next } : r)))
    startTransition(async () => {
      const res = await setTaskStatus({ id: t.id, status: next })
      if (!res.ok) {
        setRows((rs) => rs.map((r) => (r.id === t.id ? { ...r, status: t.status } : r)))
        setError(res.error)
      }
    })
  }

  function remove(t: ContactTask) {
    if (!confirm(`Delete task "${t.title}"?`)) return
    const previous = rows
    setRows((rs) => rs.filter((r) => r.id !== t.id))
    startTransition(async () => {
      const res = await deleteTask({ id: t.id })
      if (!res.ok) { setRows(previous); setError(res.error) }
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-xs font-extrabold text-zinc-700">
          <span className="mr-1">✅</span>
          Tasks
        </div>
        {open.length > 0 && (
          <span className="text-[10px] font-extrabold bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded">{open.length}</span>
        )}
      </div>

      {tableMissing ? (
        <p className="text-[11px] text-amber-800 bg-amber-50 border-l-2 border-amber-400 px-2 py-1 rounded">
          Tasks table missing — apply <code className="font-mono">schema/008</code> in Supabase.
        </p>
      ) : (
        <>
          {/* Add */}
          {adding ? (
            <div className="border-2 border-[#D72027] rounded-xl p-2 mb-2 space-y-1.5">
              <input
                type="text"
                placeholder="What's the follow-up?"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-2 py-1.5 border border-zinc-200 rounded-lg text-xs font-bold focus:border-[#D72027] focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addNew()
                  if (e.key === 'Escape') { setAdding(false); setTitle(''); setError(null) }
                }}
              />
              <div className="flex items-center gap-1 flex-wrap">
                <input
                  type="date"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  className="px-1.5 py-1 border border-zinc-200 rounded text-[11px] flex-1 min-w-0"
                  title="Due date"
                />
                <select
                  value={pri}
                  onChange={(e) => setPri(e.target.value as 'urgent' | 'high' | 'normal' | 'low')}
                  className="px-1.5 py-1 border border-zinc-200 rounded text-[11px] font-bold"
                  title="Priority"
                >
                  <option value="urgent">🔥</option>
                  <option value="high">⚡</option>
                  <option value="normal">·</option>
                  <option value="low">↓</option>
                </select>
              </div>
              <div className="flex gap-1 justify-end">
                <button onClick={() => { setAdding(false); setTitle(''); setError(null) }} className="text-[11px] font-bold text-zinc-500 px-2 py-1 rounded hover:bg-zinc-100">Cancel</button>
                <button onClick={addNew} disabled={!title.trim()} className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-[11px] px-2 py-1 rounded disabled:opacity-50">+ Add</button>
              </div>
              {error && <div className="text-[10px] text-red-700 bg-red-50 px-1.5 py-0.5 rounded">{error}</div>}
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full border-2 border-dashed border-zinc-300 hover:border-[#D72027] hover:bg-red-50 text-zinc-500 hover:text-[#D72027] font-extrabold text-[11px] px-2 py-1.5 rounded-lg mb-2"
            >
              + Add task
            </button>
          )}

          {/* Open list */}
          {open.length === 0 && done.length === 0 ? (
            <p className="text-xs text-zinc-500">No follow-ups on this contact.</p>
          ) : (
            <ul className="space-y-1.5">
              {open.map((t) => {
                const dl = dueLabel(t.dueAt)
                return (
                  <li key={t.id} className="group flex items-start gap-1.5 text-xs">
                    <button
                      onClick={() => toggle(t)}
                      className="mt-0.5 w-3.5 h-3.5 rounded border-2 border-zinc-300 hover:border-[#D72027] shrink-0"
                      aria-label="Mark done"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-zinc-800 leading-tight truncate">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle ${PRIORITY_DOT[t.priority] ?? 'bg-zinc-300'}`} />
                        {t.title}
                      </div>
                      <div className={`text-[10px] ${dl.cls}`}>{dl.label}</div>
                    </div>
                    <button
                      onClick={() => remove(t)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-600 text-sm leading-none shrink-0"
                      aria-label="Delete"
                      title="Delete task"
                    >
                      ×
                    </button>
                  </li>
                )
              })}
              {done.length > 0 && open.length > 0 && (
                <li className="text-[9px] uppercase tracking-wider text-zinc-400 pt-1 border-t border-zinc-100">Recently done</li>
              )}
              {done.map((t) => (
                <li key={t.id} className="group flex items-start gap-1.5 text-xs opacity-60">
                  <button
                    onClick={() => toggle(t)}
                    className="mt-0.5 w-3.5 h-3.5 rounded border-2 border-emerald-500 bg-emerald-500 text-white text-[9px] leading-none flex items-center justify-center shrink-0"
                    aria-label="Reopen"
                  >
                    ✓
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-zinc-500 line-through truncate">{t.title}</div>
                  </div>
                  <button
                    onClick={() => remove(t)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-600 text-sm leading-none shrink-0"
                    aria-label="Delete"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          {rows.length > 0 && (
            <a
              href="/contacts/tasks"
              className="block mt-2 text-[10px] font-bold text-zinc-400 hover:text-[#D72027] hover:underline text-center"
            >
              See all tasks →
            </a>
          )}
        </>
      )}
    </div>
  )
}
