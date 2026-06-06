'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'

// Inline tag editor for a contact row: shows tag pills (click to filter),
// remove with ×, and a "+ Add" that adds a tag (with suggestions). Saves via
// /api/contacts/tags and refreshes so smart-list filters stay in sync.
export function ContactTags({ id, tags, suggestions = [] }: { id: string; tags: string[]; suggestions?: string[] }) {
  const router = useRouter()
  const [list, setList] = useState<string[]>(tags)
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  async function mutate(tag: string, action: 'add' | 'remove') {
    const t = tag.trim()
    if (!t) return
    setBusy(true)
    const prev = list
    setList(action === 'add' ? (prev.includes(t) ? prev : [...prev, t]) : prev.filter((x) => x !== t))
    try {
      const r = await fetch('/api/contacts/tags', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, tag: t, action }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      setList(j.tags)
      router.refresh()
    } catch { setList(prev) } finally { setBusy(false) }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault(); e.stopPropagation()
    if (value.trim()) { mutate(value, 'add'); setValue('') }
    setAdding(false)
  }

  const remaining = suggestions.filter((s) => !list.includes(s)).slice(0, 8)

  return (
    <div className="flex flex-wrap items-center gap-1 max-w-[280px]" onClick={(e) => e.stopPropagation()}>
      {list.map((t) => (
        <span key={t} className="group/tag inline-flex items-center gap-0.5 text-[10px] bg-zinc-100 text-zinc-700 font-medium pl-1.5 pr-1 py-0.5 rounded">
          <a href={`/contacts?tag=${encodeURIComponent(t)}`} className="hover:underline">{t}</a>
          <button onClick={() => mutate(t, 'remove')} disabled={busy} className="text-zinc-400 hover:text-red-600" aria-label={`Remove ${t}`}><X size={10} /></button>
        </span>
      ))}
      {adding ? (
        <form onSubmit={submit} className="inline-flex items-center">
          <input
            autoFocus value={value} onChange={(e) => setValue(e.target.value)} onBlur={submit}
            list={`tagsug-${id}`} placeholder="tag…"
            className="w-24 text-[10px] border border-zinc-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-zinc-900"
          />
          <datalist id={`tagsug-${id}`}>{remaining.map((s) => <option key={s} value={s} />)}</datalist>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-0.5 text-[10px] text-zinc-400 hover:text-[#D72027] font-medium px-1 py-0.5 rounded border border-dashed border-zinc-300 hover:border-[#D72027]">
          <Plus size={10} /> Tag
        </button>
      )}
    </div>
  )
}
