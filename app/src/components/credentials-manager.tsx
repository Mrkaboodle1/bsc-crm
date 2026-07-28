'use client'

import { useState } from 'react'
import { Printer, Mail, Pencil, Trash2, Check } from 'lucide-react'

export type CredCard = { id: string | null; key: string; name: string; icon: string; expiry: string | null; url: string | null; note?: string; editable: boolean }

const WARN = 14
function daysUntil(d: string | null) { if (!d) return null; return Math.round((new Date(d.slice(0, 10) + 'T00:00:00Z').getTime() - Date.now()) / 86400000) }
function statusOf(exp: string | null, has: boolean): 'missing' | 'expired' | 'expiring' | 'valid' { if (!exp) return has ? 'valid' : 'missing'; const d = daysUntil(exp)!; if (d < 0) return 'expired'; if (d <= WARN) return 'expiring'; return 'valid' }
const UI: Record<string, { label: string; cls: string; dot: string }> = {
  valid: { label: 'Valid', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  expiring: { label: 'Renew soon', cls: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  expired: { label: 'Expired', cls: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  missing: { label: 'Not on file', cls: 'bg-zinc-50 text-zinc-500 border-zinc-200', dot: 'bg-zinc-400' },
}
function fmt(d: string | null) { return d ? new Date(d.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—' }

export function CredentialsManager({ coachName, cards: initial }: { coachName: string; cards: CredCard[] }) {
  const [cards, setCards] = useState(initial)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  async function saveExpiry(id: string) {
    setBusy(true)
    await fetch('/api/coach-documents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, expiry_on: draft || null, reset_reminder: true }) })
    setCards((cs) => cs.map((c) => c.id === id ? { ...c, expiry: draft || null } : c))
    setBusy(false); setEditing(null)
  }
  async function del(id: string, name: string) {
    if (!confirm(`Delete your ${name}? You can upload a new one anytime.`)) return
    setBusy(true)
    await fetch(`/api/coach-documents?id=${id}`, { method: 'DELETE' })
    setCards((cs) => cs.filter((c) => c.id !== id))
    setBusy(false)
  }
  function emailSummary() {
    const lines = cards.filter((c) => c.expiry || c.url).map((c) => `• ${c.name}: ${c.expiry ? 'expires ' + fmt(c.expiry) : 'on file'}`).join('\n')
    const body = `Hi,\n\nHere are my current BigStar Circus credentials:\n\n${lines}\n\n(Documents are on file in the BigStar CRM.)\n\n${coachName}`
    window.location.href = `mailto:?subject=${encodeURIComponent('My BigStar Circus credentials — ' + coachName)}&body=${encodeURIComponent(body)}`
  }

  return (
    <div>
      <style>{`@media print { .no-print{display:none!important} }`}</style>
      <div className="flex items-center justify-end gap-2 mb-4 no-print">
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 border border-zinc-300 text-zinc-700 font-bold text-sm px-3.5 py-2 rounded-lg hover:bg-zinc-50"><Printer size={15} /> Print / PDF</button>
        <button onClick={emailSummary} className="inline-flex items-center gap-1.5 border border-zinc-300 text-zinc-700 font-bold text-sm px-3.5 py-2 rounded-lg hover:bg-zinc-50"><Mail size={14} /> Email summary</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => {
          const st = statusOf(c.expiry, !!c.url || !!c.note)
          const ui = UI[st]!
          return (
            <div key={c.key + (c.id ?? '')} className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5"><span className="text-2xl">{c.icon}</span><div className="font-bold text-zinc-900 leading-tight">{c.name}{c.note && <div className="text-xs font-normal text-zinc-400">{c.note}</div>}</div></div>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${ui.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${ui.dot}`} />{ui.label}</span>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-zinc-500">Expiry</span>
                {editing === c.id ? (
                  <span className="flex items-center gap-1.5">
                    <input type="date" value={draft} onChange={(e) => setDraft(e.target.value)} className="border-2 border-zinc-200 rounded-lg px-2 py-1 text-sm focus:border-[#D72027] focus:outline-none" />
                    <button onClick={() => saveExpiry(c.id!)} disabled={busy} className="text-emerald-600"><Check size={16} /></button>
                  </span>
                ) : <span className="font-semibold text-zinc-800">{fmt(c.expiry)}</span>}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-sm">
                <span className="text-zinc-500">Document</span>
                {c.url ? <a href={c.url} target="_blank" rel="noreferrer" className="font-semibold text-[#D72027] hover:underline">📎 View</a> : <span className="text-zinc-400">None uploaded</span>}
              </div>

              {c.editable && c.id && (
                <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center gap-3 no-print">
                  <button onClick={() => { setEditing(c.id); setDraft(c.expiry?.slice(0, 10) || '') }} className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-800"><Pencil size={13} /> Edit expiry</button>
                  <button onClick={() => del(c.id!, c.name)} className="inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700"><Trash2 size={13} /> Delete</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
