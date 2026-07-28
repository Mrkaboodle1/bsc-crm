'use client'

import { useEffect, useState } from 'react'
import { ChevronUp, ChevronDown, Trash2, Plus, Check } from 'lucide-react'

type Section = { title: string; body: string }

export function WizardPagesEditor() {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Section[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!open || loaded) return
    fetch('/api/welcome-sections').then((r) => r.json()).then((j) => { setRows((j.rows ?? []).map((s: Section) => ({ title: s.title, body: s.body }))); setLoaded(true) }).catch(() => setLoaded(true))
  }, [open, loaded])

  const upd = (i: number, k: keyof Section, v: string) => setRows((r) => r.map((s, x) => x === i ? { ...s, [k]: v } : s))
  const move = (i: number, d: number) => setRows((r) => { const n = [...r]; const j = i + d; if (j < 0 || j >= n.length) return r;[n[i], n[j]] = [n[j]!, n[i]!]; return n })
  const del = (i: number) => setRows((r) => r.filter((_, x) => x !== i))

  async function save() {
    setBusy(true)
    const res = await fetch('/api/welcome-sections', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sections: rows }) })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (res.ok) { setRows((j.rows ?? []).map((s: Section) => ({ title: s.title, body: s.body }))); setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full text-left bg-white border-2 border-dashed border-zinc-300 rounded-xl px-4 py-3 hover:border-[#D72027] mb-5">
        <div className="font-black text-zinc-900">📝 Edit the sign-up “welcome pages”</div>
        <div className="text-sm text-zinc-500">The pages a new coach reads in their sign-up wizard. What you save here, they see.</div>
      </button>
    )
  }

  return (
    <div className="bg-white border-2 border-[#D72027]/20 rounded-2xl p-5 mb-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-black text-zinc-900">📝 Sign-up welcome pages</div>
          <div className="text-xs text-zinc-500">A new coach reads these one at a time in the wizard. Edit freely — what you save, they see.</div>
        </div>
        <button onClick={() => setOpen(false)} className="text-sm font-bold text-zinc-500 hover:bg-zinc-100 px-3 py-1.5 rounded-lg">Close</button>
      </div>

      {!loaded ? <div className="text-zinc-400 text-sm py-6 text-center">Loading…</div> : (
        <div className="space-y-3">
          {rows.map((s, i) => (
            <div key={i} className="border border-zinc-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded bg-[#D72027]/10 text-[#D72027] text-xs font-black flex items-center justify-center">{i + 1}</span>
                <input value={s.title} onChange={(e) => upd(i, 'title', e.target.value)} className="flex-1 font-bold text-zinc-900 border-b border-transparent focus:border-zinc-300 focus:outline-none px-1 py-1" placeholder="Page title" />
                <button onClick={() => move(i, -1)} className="text-zinc-300 hover:text-zinc-700"><ChevronUp size={16} /></button>
                <button onClick={() => move(i, 1)} className="text-zinc-300 hover:text-zinc-700"><ChevronDown size={16} /></button>
                <button onClick={() => del(i)} className="text-zinc-300 hover:text-red-500"><Trash2 size={15} /></button>
              </div>
              <textarea value={s.body} onChange={(e) => upd(i, 'body', e.target.value)} rows={4} className="w-full text-sm text-zinc-700 border border-zinc-200 rounded-lg px-3 py-2 focus:border-[#D72027] focus:outline-none resize-y" placeholder="What the coach reads on this page…" />
            </div>
          ))}
          <button onClick={() => setRows((r) => [...r, { title: '', body: '' }])} className="text-sm font-bold text-[#D72027] inline-flex items-center gap-1"><Plus size={14} /> Add a page</button>

          <div className="flex items-center gap-3 pt-2 border-t border-zinc-100">
            <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 bg-emerald-600 text-white font-black text-sm px-4 py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50">{saved ? <><Check size={15} /> Saved</> : busy ? 'Saving…' : 'Save pages'}</button>
            <span className="text-xs text-zinc-400">Changes appear in every new sign-up link instantly.</span>
          </div>
        </div>
      )}
    </div>
  )
}
