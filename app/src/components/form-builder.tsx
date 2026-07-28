'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Trash2, ArrowUp, ArrowDown, ExternalLink, Copy, Check, GripVertical,
  User, UserSquare, Calendar, Phone, Mail, MapPin, Building2, Globe,
  Type, AlignLeft, ChevronDown, ListChecks, CircleDot, CheckSquare, Star, Heading, Plus,
  Bold, Underline,
} from 'lucide-react'
import { RichText } from '@/lib/rich-text'

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

// A text box that grows to fit what you type — so long questions are fully
// visible while you edit, instead of being crammed into a one-line sliver.
function AutoTextarea({ value, onChange, taRef, className, placeholder, minRows = 2 }: {
  value: string; onChange: (v: string) => void; taRef?: (el: HTMLTextAreaElement | null) => void
  className?: string; placeholder?: string; minRows?: number
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }
  }, [value])
  return (
    <textarea
      ref={(el) => { ref.current = el; taRef?.(el) }}
      rows={minRows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      style={{ resize: 'none', overflow: 'hidden' }}
    />
  )
}

// Bold / Underline buttons that wrap whatever text you've selected.
function FormatBar({ onWrap }: { onWrap: (marker: string) => void }) {
  const btn = 'inline-flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-200 text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 text-[11px] font-semibold'
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => onWrap('**')} className={btn} title="Bold the selected text"><Bold size={12} /> Bold</button>
      <button type="button" onClick={() => onWrap('__')} className={btn} title="Underline the selected text"><Underline size={12} /> Underline</button>
      <span className="text-[10px] text-zinc-300">select text, then click</span>
    </div>
  )
}

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
  const [justAdded, setJustAdded] = useState<string | null>(null)

  const url = `${BASE}/f/${form.slug}`
  // Track each question's text box so the Bold/Underline buttons can wrap the
  // current selection. Key 'intro' is the intro box.
  const taRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  function wrap(key: string, marker: string, getVal: () => string, setVal: (v: string) => void) {
    const ta = taRefs.current[key]
    if (!ta) return
    const s = ta.selectionStart, e = ta.selectionEnd
    const val = getVal()
    const sel = val.slice(s, e) || 'text'
    const next = val.slice(0, s) + marker + sel + marker + val.slice(e)
    setVal(next)
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = s + marker.length; ta.selectionEnd = s + marker.length + sel.length })
  }
  const hasFmt = (s: string) => /(\*\*|__|\*)/.test(s)
  const upd = (id: string, patch: Partial<Field>) => setFields((fs) => fs.map((f) => f.id === id ? { ...f, ...patch } : f))
  const remove = (id: string) => setFields((fs) => fs.filter((f) => f.id !== id))
  const move = (i: number, d: number) => setFields((fs) => { const a = [...fs]; const j = i + d; if (j < 0 || j >= a.length) return fs;[a[i], a[j]] = [a[j]!, a[i]!]; return a })
  const add = (el: Element, at?: number) => {
    const nf: Field = { id: newId(), type: el.type, label: el.field, required: false, options: el.options ? [...el.options] : undefined }
    setFields((fs) => { const a = [...fs]; a.splice(at == null ? a.length : at, 0, nf); return a })
    setJustAdded(nf.id)
    setTimeout(() => setJustAdded((id) => id === nf.id ? null : id), 1800)
  }
  // Robust drop — works even when dropped onto an existing field box (stops the
  // browser dropping the text *into* an input). `at` inserts at the drop spot.
  const dropAdd = (e: React.DragEvent, at?: number) => {
    e.preventDefault(); e.stopPropagation(); setOver(false)
    try { const el = JSON.parse(e.dataTransfer.getData('text/plain')); if (el?.type) add(el, at) } catch { /* ignore */ }
  }

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
                <div
                  key={el.label}
                  role="button"
                  draggable
                  onDragStart={(e) => { e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', JSON.stringify(el)) }}
                  onClick={(e) => { add(el); (e.currentTarget as HTMLElement).blur() }}
                  className="select-none flex flex-col items-center gap-1 p-2 rounded-lg border border-zinc-200 hover:border-[#D72027] hover:bg-red-50 text-zinc-600 hover:text-[#D72027] cursor-grab active:cursor-grabbing"
                >
                  <el.Icon size={16} />
                  <span className="text-[10px] font-semibold text-center leading-tight">{el.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* RIGHT — canvas */}
      <div className="space-y-4 max-w-3xl">
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
          <div className="space-y-1.5">
            <FormatBar onWrap={(m) => wrap('intro', m, () => intro, setIntro)} />
            <AutoTextarea taRef={(el) => { taRefs.current['intro'] = el }} className={`${inp} leading-relaxed`} minRows={2} value={intro} onChange={setIntro} placeholder="Intro text shown above the form (optional). Press Enter for a new line." />
            {hasFmt(intro) && <p className="text-xs text-zinc-500 leading-relaxed bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2"><span className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Preview: </span><RichText text={intro} /></p>}
          </div>
        </div>

        {/* Drop zone / fields */}
        <div
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={dropAdd}
          className={`rounded-xl border-2 border-dashed p-3 space-y-2 min-h-[140px] transition-colors ${over ? 'border-[#D72027] bg-red-50/40' : 'border-zinc-200'}`}
        >
          {fields.length === 0 && <div className="text-center text-sm text-zinc-400 py-10">Drag a form element here, or click one on the left.</div>}
          {fields.map((f, i) => (
            <div
              key={f.id}
              ref={(el) => { if (el && justAdded === f.id) el.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}
              onDragOver={(e) => { e.preventDefault(); setOver(true) }}
              onDrop={(e) => dropAdd(e, i + 1)}
              className={`bg-white rounded-lg border p-3 transition-all ${justAdded === f.id ? 'border-[#D72027] ring-2 ring-[#D72027]/40' : 'border-zinc-200'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <GripVertical size={15} className="text-zinc-300 shrink-0" />
                <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-100 px-2 py-1 rounded shrink-0">{TYPE_LABEL[f.type] ?? f.type}</span>
                <div className="flex-1" />
                <button onClick={() => move(i, -1)} className="p-1 text-zinc-400 hover:text-zinc-700" title="Move up"><ArrowUp size={14} /></button>
                <button onClick={() => move(i, 1)} className="p-1 text-zinc-400 hover:text-zinc-700" title="Move down"><ArrowDown size={14} /></button>
                <button onClick={() => remove(f.id)} className="p-1 text-zinc-400 hover:text-red-600" title="Delete question"><Trash2 size={14} /></button>
              </div>
              <div className="pl-7 space-y-1.5 mb-2">
                <FormatBar onWrap={(m) => wrap(f.id, m, () => f.label, (v) => upd(f.id, { label: v }))} />
                <AutoTextarea taRef={(el) => { taRefs.current[f.id] = el }} className={`${inp} leading-relaxed`} minRows={f.type === 'heading' ? 1 : 2} value={f.label} onChange={(v) => upd(f.id, { label: v })} placeholder="Type your question or label here. Press Enter for a new line." />
                {hasFmt(f.label) && <p className="text-sm text-zinc-700 leading-relaxed bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2"><span className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Preview: </span><RichText text={f.label} /></p>}
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
