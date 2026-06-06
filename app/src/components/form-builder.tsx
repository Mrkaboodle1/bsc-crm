'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ArrowUp, ArrowDown, ExternalLink, Copy, Check } from 'lucide-react'

type Field = { id: string; type: string; label: string; required?: boolean; options?: string[]; placeholder?: string }
type Form = { id: string; name: string; slug: string; intro: string | null; fields: Field[] }

const TYPES: [string, string][] = [
  ['short_text', 'Short text'], ['long_text', 'Long text / message'], ['email', 'Email'], ['phone', 'Phone'],
  ['dropdown', 'Dropdown (pick one)'], ['checkboxes', 'Checkboxes (pick many)'], ['consent', 'Consent / agree box'], ['heading', 'Section heading'],
]
const BASE = 'https://app-chi-silk-29.vercel.app'
const inp = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-900'
const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `f${Math.random()}`)

export function FormBuilder({ form }: { form: Form }) {
  const router = useRouter()
  const [name, setName] = useState(form.name)
  const [intro, setIntro] = useState(form.intro ?? '')
  const [fields, setFields] = useState<Field[]>(form.fields ?? [])
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)

  const url = `${BASE}/f/${form.slug}`
  const upd = (id: string, patch: Partial<Field>) => setFields((fs) => fs.map((f) => f.id === id ? { ...f, ...patch } : f))
  const addField = () => setFields((fs) => [...fs, { id: newId(), type: 'short_text', label: 'New field', required: false }])
  const remove = (id: string) => setFields((fs) => fs.filter((f) => f.id !== id))
  const move = (i: number, d: number) => setFields((fs) => { const a = [...fs]; const j = i + d; if (j < 0 || j >= a.length) return fs;[a[i], a[j]] = [a[j]!, a[i]!]; return a })

  async function save() {
    setBusy(true); setErr(''); setDone(false)
    try {
      const r = await fetch('/api/forms', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: form.id, name, intro, fields }) })
      const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Could not save')
      setDone(true); router.refresh(); setTimeout(() => setDone(false), 2500)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save') } finally { setBusy(false) }
  }
  async function del() {
    if (!confirm('Delete this form? This cannot be undone.')) return
    await fetch(`/api/forms?id=${form.id}`, { method: 'DELETE' })
    router.push('/marketing/forms'); router.refresh()
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6 max-w-5xl">
      {/* Editor */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-3">
          <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Form name</label><input className={inp} value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Intro text (shown above the form)</label><textarea className={inp} rows={2} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="e.g. Come try a class on us!" /></div>
        </div>

        <div className="space-y-2">
          {fields.map((f, i) => (
            <div key={f.id} className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <input className={`${inp} flex-1`} value={f.label} onChange={(e) => upd(f.id, { label: e.target.value })} placeholder="Question / label" />
                <button onClick={() => move(i, -1)} className="p-1.5 text-zinc-400 hover:text-zinc-700" title="Move up"><ArrowUp size={15} /></button>
                <button onClick={() => move(i, 1)} className="p-1.5 text-zinc-400 hover:text-zinc-700" title="Move down"><ArrowDown size={15} /></button>
                <button onClick={() => remove(f.id)} className="p-1.5 text-zinc-400 hover:text-red-600" title="Remove"><Trash2 size={15} /></button>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <select className="px-2 py-1.5 border border-zinc-200 rounded-lg text-xs" value={f.type} onChange={(e) => upd(f.id, { type: e.target.value })}>
                  {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                {f.type !== 'heading' && (
                  <label className="flex items-center gap-1.5 text-xs text-zinc-600"><input type="checkbox" checked={!!f.required} onChange={(e) => upd(f.id, { required: e.target.checked })} /> Required</label>
                )}
                {(f.type === 'dropdown' || f.type === 'checkboxes') && (
                  <input className="flex-1 min-w-[200px] px-2 py-1.5 border border-zinc-200 rounded-lg text-xs" placeholder="Options, comma separated" value={(f.options ?? []).join(', ')} onChange={(e) => upd(f.id, { options: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} />
                )}
                {f.type === 'consent' && (
                  <input className="flex-1 min-w-[200px] px-2 py-1.5 border border-zinc-200 rounded-lg text-xs" placeholder="Agreement text shown beside the box" value={f.placeholder ?? ''} onChange={(e) => upd(f.id, { placeholder: e.target.value })} />
                )}
              </div>
            </div>
          ))}
          <button onClick={addField} className="w-full inline-flex items-center justify-center gap-2 border-2 border-dashed border-zinc-200 rounded-xl py-3 text-sm font-semibold text-zinc-500 hover:border-[#D72027] hover:text-[#D72027]"><Plus size={16} /> Add field</button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={busy} className="bg-[#D72027] text-white font-semibold text-sm px-5 py-2.5 rounded-lg disabled:opacity-50 hover:bg-[#A0151B]">{busy ? 'Saving…' : 'Save form'}</button>
          {done && <span className="text-sm text-emerald-600 font-medium">✓ Saved</span>}
          {err && <span className="text-sm text-red-600">{err}</span>}
          <button onClick={del} className="ml-auto text-sm font-semibold text-red-600 hover:text-red-700 inline-flex items-center gap-1.5"><Trash2 size={15} /> Delete form</button>
        </div>
      </div>

      {/* Share / connect */}
      <div className="space-y-4 self-start">
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <h3 className="font-semibold text-zinc-900 mb-1">Put it on your website</h3>
          <p className="text-sm text-zinc-500 mb-3">Share this link, or paste the embed code onto a page (e.g. bigstarcircus.com.au/free-trial).</p>
          <div className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 break-all mb-2">{url}</div>
          <div className="flex flex-wrap gap-1.5">
            <a href={url} target="_blank" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#D72027] hover:bg-[#A0151B] rounded-md px-2.5 py-1.5"><ExternalLink size={13} /> Preview</a>
            <button onClick={() => { navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }) }} className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 border border-zinc-200 rounded-md px-2.5 py-1.5 hover:bg-zinc-50">{copied ? <><Check size={13} className="text-emerald-600" /> Copied</> : <><Copy size={13} /> Copy link</>}</button>
          </div>
          <div className="mt-3">
            <div className="text-[11px] font-semibold text-zinc-500 mb-1">Embed code</div>
            <textarea readOnly rows={3} className="w-full text-[10px] font-mono bg-zinc-50 border border-zinc-200 rounded-lg p-2" value={`<iframe src="${url}" width="100%" height="700" style="border:0;border-radius:16px"></iframe>`} />
          </div>
        </div>
      </div>
    </div>
  )
}
