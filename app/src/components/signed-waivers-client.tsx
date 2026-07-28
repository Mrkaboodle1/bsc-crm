'use client'

import { useState, useMemo } from 'react'
import { Search, Printer } from 'lucide-react'

export type Waiver = {
  id: string; event_type: string; parent_name: string | null; email: string | null; phone: string | null
  emergency: string | null; children: string | null; medical: string | null
  consent_photo: boolean | null; terms_agreed: boolean | null; signature: string | null; signed_at: string | null
}

const EVENT: Record<string, { label: string; cls: string }> = {
  free_trial: { label: 'Free Trial', cls: 'bg-blue-100 text-blue-800' },
  shw: { label: 'Holiday Workshop', cls: 'bg-emerald-100 text-emerald-800' },
  kno: { label: 'Kids Night Out', cls: 'bg-violet-100 text-violet-800' },
  class: { label: 'Class', cls: 'bg-amber-100 text-amber-800' },
}
const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export function SignedWaiversClient({ initial }: { initial: Waiver[] }) {
  const [q, setQ] = useState('')
  const [event, setEvent] = useState('')
  const shown = useMemo(() => initial.filter((w) => {
    if (event && w.event_type !== event) return false
    if (!q.trim()) return true
    const hay = `${w.parent_name ?? ''} ${w.children ?? ''} ${w.email ?? ''} ${w.phone ?? ''}`.toLowerCase()
    return hay.includes(q.toLowerCase())
  }), [initial, q, event])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap print:hidden">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search parent, child, email or phone…" className="w-full pl-9 pr-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#D72027]" />
        </div>
        <select value={event} onChange={(e) => setEvent(e.target.value)} className="px-3 py-2.5 border border-zinc-200 rounded-lg text-sm bg-white">
          <option value="">All events</option>
          <option value="free_trial">Free Trial</option>
          <option value="shw">Holiday Workshop</option>
          <option value="kno">Kids Night Out</option>
          <option value="class">Class</option>
        </select>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 bg-zinc-900 text-white font-bold text-sm px-4 py-2.5 rounded-lg"><Printer size={15} /> Print</button>
      </div>

      <div className="text-sm text-zinc-500 print:hidden">{shown.length} signed waiver{shown.length === 1 ? '' : 's'}</div>

      <ul className="space-y-2">
        {shown.map((w) => {
          const ev = EVENT[w.event_type] ?? EVENT.class
          return (
            <li key={w.id} className="bg-white rounded-2xl border border-zinc-200 p-4 break-inside-avoid">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded ${ev.cls}`}>{ev.label}</span>
                <span className="font-extrabold text-zinc-900">{w.parent_name || '—'}</span>
                <span className="text-xs text-zinc-400">· signed {fmt(w.signed_at)}</span>
                {w.consent_photo && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">📷 photo OK</span>}
                {w.terms_agreed && <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded">T&amp;Cs ✓</span>}
              </div>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-zinc-700">
                {w.children && <div><span className="text-zinc-400 text-xs">Children: </span>{w.children}</div>}
                {w.email && <div><span className="text-zinc-400 text-xs">Email: </span>{w.email}</div>}
                {w.phone && <div><span className="text-zinc-400 text-xs">Phone: </span>{w.phone}</div>}
                {w.emergency && <div><span className="text-zinc-400 text-xs">Emergency: </span>{w.emergency}</div>}
                {w.medical && <div className="sm:col-span-2 text-red-700"><span className="text-red-400 text-xs">⚕ Medical: </span>{w.medical}</div>}
                {w.signature && <div className="sm:col-span-2"><span className="text-zinc-400 text-xs">Signature: </span><span className="italic">{w.signature}</span></div>}
              </div>
            </li>
          )
        })}
      </ul>
      {shown.length === 0 && <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-sm text-zinc-500">No signed waivers match.</div>}
    </div>
  )
}
