'use client'

// Tectonic-style tag editor. Chips with × to remove. + button opens a
// search box with autocomplete from the tenant's existing tag library;
// if no exact match appears, a "+ Create '___'" row lets the user mint
// a new tag on the fly.

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { addTag, listAllTags, removeTag } from './actions'

export function TagPicker({
  contactId,
  initialTags,
}: {
  contactId: string
  initialTags: string[]
}) {
  const [tags, setTags] = useState<string[]>(initialTags)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [library, setLibrary] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  // Lazy-load the tag library the first time the picker opens.
  useEffect(() => {
    if (!open) return
    if (library.length > 0) return
    listAllTags().then((res) => {
      if (res.ok) setLibrary(res.tags)
    })
    setTimeout(() => inputRef.current?.focus(), 30)
  }, [open, library.length])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    const already = new Set(tags.map((t) => t.toLowerCase()))
    const suggestions = library.filter((t) => !already.has(t.toLowerCase()))
    if (!q) return suggestions.slice(0, 10)
    return suggestions.filter((t) => t.toLowerCase().includes(q)).slice(0, 10)
  }, [query, library, tags])

  const exactExists = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return library.some((t) => t.toLowerCase() === q) || tags.some((t) => t.toLowerCase() === q)
  }, [query, library, tags])

  async function commitAdd(tag: string) {
    const trimmed = tag.trim()
    if (!trimmed) return
    setBusy(true)
    setTags((prev) => (prev.some((t) => t.toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, trimmed]))
    if (!library.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setLibrary((prev) => [...prev, trimmed].sort())
    }
    setQuery('')
    startTransition(async () => {
      const res = await addTag({ contactId, tag: trimmed })
      setBusy(false)
      if (!res.ok) {
        // Rollback on error
        setTags((prev) => prev.filter((t) => t !== trimmed))
        alert(`Couldn't add tag: ${res.error}`)
      }
    })
  }

  async function commitRemove(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
    startTransition(async () => {
      const res = await removeTag({ contactId, tag })
      if (!res.ok) {
        // Rollback
        setTags((prev) => [...prev, tag])
        alert(`Couldn't remove tag: ${res.error}`)
      }
    })
  }

  return (
    <div className="relative">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
          Tags ({tags.length})
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-700 text-xs font-bold px-2 py-1 rounded-md"
          >
            {t}
            <button
              type="button"
              onClick={() => commitRemove(t)}
              className="text-zinc-400 hover:text-red-600 text-sm leading-none ml-0.5"
              aria-label={`Remove tag ${t}`}
            >
              ×
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-zinc-300 text-zinc-500 hover:border-[#D72027] hover:text-[#D72027] text-sm font-extrabold"
          aria-label="Add tag"
        >
          +
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 bg-white border-2 border-zinc-200 rounded-2xl shadow-xl z-20 overflow-hidden">
          <div className="p-2 border-b border-zinc-100">
            <input
              ref={inputRef}
              type="search"
              placeholder="Search or create…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (query.trim()) commitAdd(query.trim())
                } else if (e.key === 'Escape') {
                  setOpen(false)
                }
              }}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto divide-y divide-zinc-100">
            {matches.map((t) => (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => commitAdd(t)}
                  disabled={busy}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 font-bold text-zinc-700"
                >
                  {t}
                </button>
              </li>
            ))}
            {query.trim() && !exactExists && (
              <li>
                <button
                  type="button"
                  onClick={() => commitAdd(query.trim())}
                  disabled={busy}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-[#D72027] font-extrabold"
                >
                  + Create &lsquo;{query.trim()}&rsquo;
                </button>
              </li>
            )}
            {matches.length === 0 && !query.trim() && (
              <li className="px-3 py-3 text-xs text-zinc-400 italic">
                Type to search or create. Every tag you make joins the library.
              </li>
            )}
          </ul>
          <div className="px-3 py-2 border-t border-zinc-100 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-bold text-zinc-500 hover:text-zinc-900"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
