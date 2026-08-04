'use client'

import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'

type Result = { type: string; label: string; sub: string; href: string }

export function GlobalSearch() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authExpired, setAuthExpired] = useState(false)
  const [errored, setErrored] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  // ⌘K / Ctrl+K focuses the search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inputRef.current?.focus() }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // debounced search
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
        const j = await r.json()
        setAuthExpired(!!j.authExpired)
        setErrored(!!j.error)
        setResults(j.results || [])
      } catch { setResults([]); setErrored(true) } finally { setLoading(false) }
    }, 220)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-2 bg-zinc-900 ring-1 ring-zinc-800 rounded-lg px-2.5 py-2 focus-within:ring-zinc-600">
        <Search size={14} className="text-zinc-500 shrink-0" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search"
          className="flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none min-w-0"
        />
        <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-zinc-400 shrink-0">⌘K</span>
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl border border-zinc-200 py-1.5 z-50 max-h-80 overflow-y-auto">
          {loading && results.length === 0 && <div className="px-3 py-2 text-xs text-zinc-400">Searching…</div>}
          {!loading && authExpired && (
            <a href={`/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`} className="block px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50">
              ⚠️ Your login has timed out — tap here to sign in again, then search will work.
            </a>
          )}
          {!loading && !authExpired && errored && <div className="px-3 py-2 text-xs text-red-500">Search hit a snag — try again in a moment.</div>}
          {!loading && !authExpired && !errored && results.length === 0 && <div className="px-3 py-2 text-xs text-zinc-400">No matches for “{q}”.</div>}
          {results.map((r, i) => (
            <a key={i} href={r.href} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-zinc-50">
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-800 truncate">{r.label}</div>
                <div className="text-[11px] text-zinc-400 truncate">{r.sub}</div>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 shrink-0">{r.type}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
