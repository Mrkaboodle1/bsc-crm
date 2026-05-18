'use client'

// Tectonic-style saved-filter tabs above the contacts table. Click a tab
// → applies that smart list's criteria to /contacts. The "+ Add smart
// list" button captures the CURRENT URL filters and saves them as a new
// named list.

import { useState, useTransition } from 'react'
import { createSmartList, deleteSmartList } from './actions'

export type SmartList = {
  id: string
  name: string
  criteria: Record<string, unknown>
}

export function SmartListTabs({
  lists,
  activeId,
  currentParams,
}: {
  lists: SmartList[]
  activeId: string | null
  currentParams: Record<string, string>
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function addList() {
    const name = prompt('Name this smart list (e.g. "Friday aerial parents", "Play On 2026"):')
    if (!name?.trim()) return
    // Snapshot the current filter set from the URL params (drop noise like ?list= itself)
    const criteria: Record<string, string> = {}
    for (const [k, v] of Object.entries(currentParams)) {
      if (!v) continue
      if (k === 'list') continue
      criteria[k] = v
    }
    setError(null)
    startTransition(async () => {
      const res = await createSmartList({ name: name.trim(), criteria })
      if (!res.ok) { setError(res.error); return }
      // Navigate to the new list
      window.location.href = `/contacts?list=${res.id}`
    })
  }

  function removeList(id: string, name: string) {
    if (!confirm(`Delete smart list "${name}"? (Contacts not affected.)`)) return
    startTransition(async () => {
      const res = await deleteSmartList({ id })
      if (!res.ok) { setError(res.error); return }
      if (activeId === id) window.location.href = '/contacts'
      else window.location.reload()
    })
  }

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
      <a
        href="/contacts"
        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap ${
          activeId === null
            ? 'bg-zinc-900 text-white shadow'
            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
        }`}
      >
        🏷 All
      </a>
      {lists.map((l) => {
        const active = activeId === l.id
        return (
          <div key={l.id} className="relative group shrink-0">
            <a
              href={`/contacts?list=${l.id}`}
              className={`block px-3 py-1.5 pr-7 rounded-lg text-xs font-extrabold whitespace-nowrap ${
                active
                  ? 'bg-gradient-to-br from-[#FFC107] to-amber-500 text-zinc-900 shadow'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              {l.name}
            </a>
            <button
              type="button"
              onClick={() => removeList(l.id, l.name)}
              disabled={pending}
              className={`absolute top-1/2 -translate-y-1/2 right-1.5 w-4 h-4 rounded-full text-[10px] leading-none flex items-center justify-center ${
                active ? 'text-zinc-700 hover:bg-zinc-900 hover:text-white' : 'text-zinc-400 hover:bg-red-500 hover:text-white'
              } opacity-0 group-hover:opacity-100`}
              aria-label={`Delete smart list ${l.name}`}
              title={`Delete "${l.name}"`}
            >
              ×
            </button>
          </div>
        )
      })}
      <button
        type="button"
        onClick={addList}
        disabled={pending}
        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold text-[#D72027] border-2 border-dashed border-[#D72027]/40 hover:border-[#D72027] hover:bg-red-50 whitespace-nowrap disabled:opacity-50"
      >
        + Add smart list
      </button>
      {error && <span className="text-xs text-red-700 ml-2">{error}</span>}
    </div>
  )
}
