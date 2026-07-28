'use client'
import { useEffect, useState } from 'react'

type Step = { id: string; step_order: number; tag: string | null; offset_days: number; subject: string | null; body_html: string | null; active: boolean }

export function SequenceEditor() {
  const [steps, setSteps] = useState<Step[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => { fetch('/api/sequence-steps').then((r) => r.json()).then((d) => { setSteps(d.steps || []); setLoading(false) }).catch(() => setLoading(false)) }, [])

  const set = (id: string, k: keyof Step, v: unknown) => setSteps((s) => s.map((x) => x.id === id ? { ...x, [k]: v } as Step : x))
  async function save(st: Step) {
    setSaving(st.id); setMsg('')
    const res = await fetch('/api/sequence-steps', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: st.id, subject: st.subject, body_html: st.body_html, offset_days: st.offset_days, active: st.active }) })
    setSaving(null)
    setMsg(res.ok ? `Saved “${st.subject}” ✓` : 'Could not save')
    setTimeout(() => setMsg(''), 2500)
  }

  if (loading) return <div className="bg-white rounded-2xl border border-zinc-200 p-4 text-sm text-zinc-500">Loading your sequence…</div>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-zinc-900">🛠️ Edit your Free-Trial sequence</h2>
        {msg && <span className="text-xs font-bold text-emerald-700">{msg}</span>}
      </div>
      <p className="text-xs text-zinc-500">Change the wording, subject, or how many days after sign-up each email sends. Use <code>{'{{first_name}}'}</code> to drop in the parent’s name. Changes apply to every new trial.</p>
      {steps.map((st) => (
        <div key={st.id} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <button onClick={() => setOpenId(openId === st.id ? null : st.id)} className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-zinc-50">
            <div className="min-w-0">
              <div className="font-bold text-zinc-900 truncate">{st.subject || '(no subject)'}</div>
              <div className="text-xs text-zinc-500">{st.offset_days === 0 ? 'Sends immediately' : `Sends ${st.offset_days} day${st.offset_days === 1 ? '' : 's'} after sign-up`} · {st.tag}</div>
            </div>
            <span className="text-zinc-400 shrink-0">{openId === st.id ? '▲' : '▼ edit'}</span>
          </button>
          {openId === st.id && (
            <div className="border-t border-zinc-100 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wide text-zinc-500">Subject</label>
                  <input value={st.subject ?? ''} onChange={(e) => set(st.id, 'subject', e.target.value)} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wide text-zinc-500">Days after sign-up</label>
                  <input type="number" min={0} value={st.offset_days} onChange={(e) => set(st.id, 'offset_days', parseInt(e.target.value, 10) || 0)} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wide text-zinc-500">Email content</label>
                <textarea value={st.body_html ?? ''} onChange={(e) => set(st.id, 'body_html', e.target.value)} rows={12} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs font-mono" />
              </div>
              <details className="text-xs">
                <summary className="cursor-pointer text-zinc-500 font-bold">Preview</summary>
                <div className="border border-zinc-200 rounded-lg p-3 mt-2" dangerouslySetInnerHTML={{ __html: (st.body_html || '').replace(/\{\{\s*(?:contact\.)?first_name\s*\}\}/gi, 'Sarah') }} />
              </details>
              <div className="flex items-center gap-3">
                <button onClick={() => save(st)} disabled={saving === st.id} className="bg-[#D72027] text-white font-bold text-sm px-5 py-2 rounded-lg hover:bg-[#A0151B] disabled:opacity-50">{saving === st.id ? 'Saving…' : 'Save'}</button>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600"><input type="checkbox" checked={st.active} onChange={(e) => set(st.id, 'active', e.target.checked)} /> Active</label>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
