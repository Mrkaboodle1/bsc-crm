'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Trash2, ArrowUp, ArrowDown, ExternalLink, Copy, Check, GripVertical,
  User, UserSquare, Calendar, Phone, Mail, MapPin, Building2, Globe,
  Type, AlignLeft, ChevronDown, ListChecks, CircleDot, CheckSquare, Star, Heading, Plus,
} from 'lucide-react'

type Field = { id: string; type: string; label: string; required?: boolean; options?: string[]; placeholder?: string }
type Form = { id: string; name: string; slug: string; intro: string | null; fields: Field[] }
type Element = { label: string; type: string; field: string; options?: string[]; Icon: typeof User }

const PALETTE: { group: string; items: Element[] }[] = [
  { group: 'Personal info', items: [
    { label: 'Full Name', type: 'short_text', field: 'Full name', Icon: User },
    { label: 'First Name', type: 'short_text', field: 'First name', Icon: User },
    { label: 'Last Name', type: 'short_text', field: 'Last name', Icon: UserSquare },
    { label: 'Date of Birth', type: 'date', field: 'Date of birth', Icon: Calendar },
    { label: 'Phone', type: 'phone', field: 'Phone', Icon: Phone },
    { label: 'Email', type: 'email', field: 'Email', Icon: Mail },
  ] },
  { group: 'Address', items: [
    { label: 'Address', type: 'short_text', field: 'Address', Icon: MapPin },
    { label: 'City', type: 'short_text', field: 'City', Icon: Building2 },
    { label: 'State', type: 'short_text', field: 'State', Icon: MapPin },
    { label: 'Country', type: 'short_text', field: 'Country', Icon: Globe },
    { label: 'Postcode', type: 'short_text', field: 'Postcode', Icon: MapPin },
    { label: 'Organisation', type: 'short_text', field: 'Organisation', Icon: Building2 },
    { label: 'Website', type: 'short_text', field: 'Website', Icon: Globe },
  ] },
  { group: 'Text', items: [
    { label: 'Single Line', type: 'short_text', field: 'Short answer', Icon: Type },
    { label: 'Paragraph', type: 'long_text', field: 'Your message', Icon: AlignLeft },
  ] },
  { group: 'Choices', items: [
    { label: 'Dropdown', type: 'dropdown', field: 'Choose one', options: ['Option 1', 'Option 2'], Icon: ChevronDown },
    { label: 'Multi-select', type: 'checkboxes', field: 'Select all that apply', options: ['Option 1', 'Option 2'], Icon: ListChecks },
    { label: 'Radio', type: 'radio', field: 'Pick one', options: ['Option 1', 'Option 2'], Icon: CircleDot },
    { label: 'Tick box', type: 'consent', field: 'Agreement', Icon: CheckSquare },
  ] },
  { group: 'Extras', items: [
    { label: 'Rating', type: 'rating', field: 'Rating', Icon: Star },
    { label: 'Heading', type: 'heading', field: 'Section heading', Icon: Heading },
  ] },
]
const TYPE_LABEL: Record<string, string> = { short_text: 'Short text', long_text: 'Long text', email: 'Email', phone: 'Phone', date: 'Date', dropdown: 'Dropdown', checkboxes: 'Multi-select', radio: 'Radio', consent: 'Tick box', rating: 'Rating', heading: 'Heading' }
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
  const [over, setOver] = useState(false)

  const url = `${BASE}/f/${form.slug}`
  const upd = (id: string, patch: Partial<Field>) => setFields((fs) => fs.map((f) => f.id === id ? { ...f, ...patch } : f))
  const remove = (id: string) => setFields((fs) => fs.filter((f) => f.id !== id))
  const move = (i: number, d: number) => setFields((fs) => { const a = [...fs]; const j = i + d; if (j < 0 || j >= a.length) return fs;[a[i], a[j]] = [a[j]!, a[i]!]; return a })
  const add = (el: Element) => setFields((fs) => [...fs, { id: newId(), type: el.type, label: el.field, required: false, options: el.options ? [...el.options] : undefined }])

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
    await fetch(`/api/forms?id=${form.id}`, { method: 'DELETE' }); router.push('/marketing/forms'); router.refresh()
  }

  return (
    <div className="grid lg:grid-cols-[210px_1fr] gap-5">
      {/* LEFT — palette */}
      <div className="bg-white rounded-xl border border-zinc-200 p-3 self-start max-h-[calc(100vh-200px)] overflow-y-auto sticky top-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2 px-1">Form elements</div>
        <p className="text-[10px] text-zinc-400 px-1 mb-3">Click or drag onto your form →</p>
        {PALETTE.map((g) => (
          <div key={g.group} className="mb-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 px-1">{g.group}</div>
            <div className="grid grid-cols-2 gap-1.5">
              {g.items.map((el) => (
                <button
                  key={el.label}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify(el))}
                  onClick={() => add(el)}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg border border-zinc-200 hover:border-[#D72027] hover:bg-red-50 text-zinc-600 hover:text-[#D72027] cursor-grab active:cursor-grabbing"
                >
                  <el.Icon size={16} />
                  <span className="text-[10px] font-semibold text-center leading-tight">{el.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* RIGHT — canvas */}
      <div className="space-y-4 max-w-2xl">
        {/* Share bar */}
        <div className="bg-white rounded-xl border border-zinc-200 p-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-500">Live link:</span>
          <code className="text-xs bg-zinc-50 border border-zinc-200 rounded px-2 py-1">{url}</code>
          <a href={url} target="_blank" className="inline-flex items-center gap-1 text-xs font-semibold text-[#D72027] hover:underline"><ExternalLink size={12} /> Preview</a>
          <button onClick={() => { navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }) }} className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-900 ml-auto">{copied ? <><Check size={12} className="text-emerald-600" /> Copied</> : <><Copy size={12} /> Copy link</>}</button>
        </div>

        {/* Title card */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-3">
          <input className="w-full text-lg font-bold text-zinc-900 border-0 focus:outline-none focus:ring-0 px-0" value={name} onChange={(e) => setName(e.target.value)} placeholder="Form name" />
          <textarea className={inp} rows={2} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="Intro text shown above the form (optional)" />
        </div>

        {/* Drop zone / fields */}
        <div
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); try { add(JSON.parse(e.dataTransfer.getData('text/plain'))) } catch { /* ignore */ } }}
          className={`rounded-xl border-2 border-dashed p-3 space-y-2 min-h-[140px] transition-colors ${over ? 'border-[#D72027] bg-red-50/40' : 'border-zinc-200'}`}
        >
          {fields.length === 0 && <div className="text-center text-sm text-zinc-400 py-10">Drag a form element here, or click one on the left.</div>}
          {fields.map((f, i) => (
            <div key={f.id} className="bg-white rounded-lg border border-zinc-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <GripVertical size={15} className="text-zinc-300 shrink-0" />
                <input className={`${inp} flex-1`} value={f.label} onChange={(e) => upd(f.id, { label: e.target.value })} placeholder="Question / label" />
                <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-100 px-2 py-1 rounded shrink-0">{TYPE_LABEL[f.type] ?? f.type}</span>
                <button onClick={() => move(i, -1)} className="p-1 text-zinc-400 hover:text-zinc-700"><ArrowUp size={14} /></button>
                <button onClick={() => move(i, 1)} className="p-1 text-zinc-400 hover:text-zinc-700"><ArrowDown size={14} /></button>
                <button onClick={() => remove(f.id)} className="p-1 text-zinc-400 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
              <div className="flex items-center gap-3 flex-wrap pl-7">
                {f.type !== 'heading' && <label className="flex items-center gap-1.5 text-xs text-zinc-600"><input type="checkbox" checked={!!f.required} onChange={(e) => upd(f.id, { required: e.target.checked })} /> Required</label>}
                {(f.type === 'dropdown' || f.type === 'checkboxes' || f.type === 'radio') && (
                  <input className="flex-1 min-w-[200px] px-2 py-1.5 border border-zinc-200 rounded-lg text-xs" placeholder="Options, comma separated" value={(f.options ?? []).join(', ')} onChange={(e) => upd(f.id, { options: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} />
                )}
                {f.type === 'consent' && <input className="flex-1 min-w-[200px] px-2 py-1.5 border border-zinc-200 rounded-lg text-xs" placeholder="Wording beside the tick box" value={f.placeholder ?? ''} onChange={(e) => upd(f.id, { placeholder: e.target.value })} />}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={busy} className="bg-[#D72027] text-white font-semibold text-sm px-5 py-2.5 rounded-lg disabled:opacity-50 hover:bg-[#A0151B]">{busy ? 'Saving…' : 'Save form'}</button>
          {done && <span className="text-sm text-emerald-600 font-medium">✓ Saved</span>}
          {err && <span className="text-sm text-red-600">{err}</span>}
          <button onClick={del} className="ml-auto text-sm font-semibold text-red-600 hover:text-red-700 inline-flex items-center gap-1.5"><Trash2 size={15} /> Delete</button>
        </div>

        <details className="bg-white rounded-xl border border-zinc-200 p-4">
          <summary className="text-sm font-semibold text-zinc-700 cursor-pointer flex items-center gap-1.5"><Plus size={14} /> Embed on your website</summary>
          <p className="text-xs text-zinc-500 mt-2 mb-2">Paste this onto a page (e.g. bigstarcircus.com.au/free-trial):</p>
          <textarea readOnly rows={3} className="w-full text-[10px] font-mono bg-zinc-50 border border-zinc-200 rounded-lg p-2" value={`<iframe src="${url}" width="100%" height="700" style="border:0;border-radius:16px"></iframe>`} />
        </details>
      </div>
    </div>
  )
}
