'use client'

import { useState } from 'react'
import { Mail, Phone, GripVertical } from 'lucide-react'
import { RowActions } from '@/components/row-actions'

export type PFamily = {
  id: string; family_name: string; primary_parent: string | null
  email: string | null; phone: string | null; source: string | null
  lifecycle_stage: string; weekly_fee_total: number | null
}
const COLUMNS: { key: string; label: string; accent: string; head: string }[] = [
  { key: 'lead', label: 'New Leads', accent: 'border-t-zinc-400', head: 'text-zinc-600' },
  { key: 'trial', label: 'Trial', accent: 'border-t-blue-400', head: 'text-blue-700' },
  { key: 'active', label: 'Active Member', accent: 'border-t-emerald-500', head: 'text-emerald-700' },
  { key: 'paused', label: 'Paused', accent: 'border-t-amber-400', head: 'text-amber-700' },
  { key: 'lost', label: 'Lost', accent: 'border-t-red-400', head: 'text-red-700' },
]
const SOURCE: Record<string, string> = { fb_ad: 'Facebook', instagram: 'Instagram', google: 'Google', word_of_mouth: 'Word of mouth', school: 'School', walkin: 'Walk-in', open_day: 'Open day', other: 'Other' }

export function LeadPipeline({ families, leadTotal }: { families: PFamily[]; leadTotal: number }) {
  const [items, setItems] = useState<PFamily[]>(families)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<string | null>(null)

  async function moveTo(id: string, stage: string) {
    const cur = items.find((f) => f.id === id)
    if (!cur || cur.lifecycle_stage === stage) return
    setItems((xs) => xs.map((f) => f.id === id ? { ...f, lifecycle_stage: stage } : f))
    try {
      const r = await fetch('/api/families/lifecycle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, stage }) })
      if (!r.ok) throw new Error()
    } catch {
      setItems((xs) => xs.map((f) => f.id === id ? { ...f, lifecycle_stage: cur.lifecycle_stage } : f)) // revert
    }
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {COLUMNS.map((col) => {
          const cards = items.filter((f) => f.lifecycle_stage === col.key)
          const extra = col.key === 'lead' ? Math.max(0, leadTotal - cards.length) : 0
          return (
            <div
              key={col.key}
              onDragOver={(e) => { e.preventDefault(); setOverCol(col.key) }}
              onDragLeave={() => setOverCol((c) => c === col.key ? null : c)}
              onDrop={(e) => { e.preventDefault(); setOverCol(null); if (dragId) moveTo(dragId, col.key); setDragId(null) }}
              className={`w-72 shrink-0 bg-zinc-50 rounded-xl border-t-4 ${col.accent} ${overCol === col.key ? 'ring-2 ring-[#D72027]/40 bg-red-50/30' : ''}`}
            >
              <div className="px-3 py-2.5 flex items-center justify-between">
                <span className={`text-xs font-extrabold uppercase tracking-wide ${col.head}`}>{col.label}</span>
                <span className="text-xs font-bold text-zinc-400">{cards.length}{extra ? `+${extra}` : ''}</span>
              </div>
              <div className="px-2 pb-3 space-y-2 min-h-[120px] max-h-[calc(100vh-260px)] overflow-y-auto">
                {cards.map((f) => (
                  <div
                    key={f.id}
                    draggable
                    onDragStart={() => setDragId(f.id)}
                    onDragEnd={() => setDragId(null)}
                    className={`bg-white rounded-lg border border-zinc-200 p-2.5 cursor-grab active:cursor-grabbing hover:border-zinc-300 hover:shadow-sm ${dragId === f.id ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start gap-1.5">
                      <GripVertical size={14} className="text-zinc-300 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <a href={`/contacts/${f.id}`} className="font-bold text-sm text-zinc-900 hover:text-[#D72027] block truncate">{f.family_name}</a>
                        {f.primary_parent && <div className="text-xs text-zinc-500 truncate">{f.primary_parent}</div>}
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                          {f.email && <span className="inline-flex items-center gap-0.5 truncate"><Mail size={10} /> {f.email}</span>}
                          {!f.email && f.phone && <span className="inline-flex items-center gap-0.5"><Phone size={10} /> {f.phone}</span>}
                        </div>
                        {f.source && <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wide text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">{SOURCE[f.source] ?? f.source}</span>}
                      </div>
                      <RowActions
                        className="shrink-0 -mr-1"
                        editHref={`/contacts/${f.id}`}
                        deleteUrl={`/api/contacts?id=${f.id}`}
                        confirmText={`Delete ${f.family_name}? Use this for spam or test enquiries — real families should be moved to Lost instead.`}
                      />
                    </div>
                  </div>
                ))}
                {extra > 0 && <a href="/contacts?stage=lead" className="block text-center text-xs font-semibold text-[#D72027] py-2 hover:underline">+{extra} more leads — view all →</a>}
                {cards.length === 0 && <div className="text-center text-xs text-zinc-300 py-6">Drop here</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
