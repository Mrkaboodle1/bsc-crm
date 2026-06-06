'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500) } catch { /* ignore */ } }}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 border border-zinc-200 rounded-md px-2.5 py-1.5 hover:bg-zinc-50"
    >
      {done ? <><Check size={13} className="text-emerald-600" /> Copied</> : <><Copy size={13} /> {label}</>}
    </button>
  )
}
