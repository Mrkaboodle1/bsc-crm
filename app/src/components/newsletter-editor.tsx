'use client'

import { useState, useRef, useEffect } from 'react'
import { Type, AlignLeft, Image as ImageIcon, CalendarDays, MousePointerClick, Minus, GripVertical, ArrowUp, ArrowDown, Trash2, Upload } from 'lucide-react'
import { RichText } from '@/lib/rich-text'

export type Block =
  | { id: string; type: 'heading'; text: string }
  | { id: string; type: 'text'; text: string }
  | { id: string; type: 'image'; url: string }
  | { id: string; type: 'event'; title: string; date: string; blurb: string; btnText: string; btnUrl: string }
  | { id: string; type: 'button'; text: string; url: string }
  | { id: string; type: 'divider' }

export type Branding = { name: string; logoUrl: string; primary: string; accent: string; phone: string; website: string }
export type Header = { show: boolean; title: string; subtitle: string }
export function defaultHeader(content: Record<string, unknown> | null, brandName: string, monthLabel: string): Header {
  const h = content?.header as Partial<Header> | undefined
  return { show: h?.show ?? true, title: h?.title ?? brandName, subtitle: h?.subtitle ?? `★ ${monthLabel} ★` }
}

const nid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `b${Math.random()}`)
const PALETTE: { type: Block['type']; label: string; Icon: typeof Type }[] = [
  { type: 'heading', label: 'Heading', Icon: Type },
  { type: 'text', label: 'Text', Icon: AlignLeft },
  { type: 'image', label: 'Image', Icon: ImageIcon },
  { type: 'event', label: 'Event', Icon: CalendarDays },
  { type: 'button', label: 'Button', Icon: MousePointerClick },
  { type: 'divider', label: 'Divider', Icon: Minus },
]
function blank(type: Block['type']): Block {
  switch (type) {
    case 'heading': return { id: nid(), type, text: 'New heading' }
    case 'text': return { id: nid(), type, text: 'Write your text here. Use **bold** or __underline__ for emphasis.' }
    case 'image': return { id: nid(), type, url: '' }
    case 'event': return { id: nid(), type, title: 'Event name', date: 'Saturday 00 Month · 0:00pm', blurb: 'A line about the event.', btnText: 'Book now', btnUrl: '' }
    case 'button': return { id: nid(), type, text: 'Button text', url: '' }
    case 'divider': return { id: nid(), type }
  }
}

export function migrateToBlocks(content: Record<string, unknown> | null): Block[] {
  if (content && Array.isArray(content.blocks)) return content.blocks as Block[]
  const g = (k: string) => (content?.[k] as string) || ''
  const out: Block[] = []
  if (g('intro')) out.push({ id: nid(), type: 'text', text: g('intro') })
  if (g('image_hero')) out.push({ id: nid(), type: 'image', url: g('image_hero') })
  if (g('heroTitle') || g('heroDate') || g('heroBlurb')) out.push({ id: nid(), type: 'event', title: g('heroTitle'), date: g('heroDate'), blurb: g('heroBlurb'), btnText: 'Book now', btnUrl: '' })
  if (g('whatsOn')) { out.push({ id: nid(), type: 'heading', text: "📅 What's on" }, { id: nid(), type: 'text', text: g('whatsOn') }) }
  if (g('classes')) { out.push({ id: nid(), type: 'heading', text: '🎟️ Classes' }, { id: nid(), type: 'text', text: g('classes') }) }
  return out.length ? out : [{ id: nid(), type: 'text', text: 'Start your newsletter — add blocks from the left.' }]
}

const inp = 'w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#D72027] focus:ring-2 focus:ring-[#D72027]/15'
const fieldLabel = 'block text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-1'
const META = Object.fromEntries(PALETTE.map((p) => [p.type, p])) as Record<Block['type'], (typeof PALETTE)[number]>

// A textarea that grows with its content — no tiny scroll boxes.
function AutoTextarea({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = Math.max(64, el.scrollHeight) + 'px' } }, [value])
  return <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} className={`${className} resize-none overflow-hidden leading-relaxed`} />
}

// The "add a block" bar — big friendly buttons.
function AddBar({ add }: { add: (t: Block['type']) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-2">➕ Add a block</div>
      <div className="flex flex-wrap gap-2">
        {PALETTE.map((p) => (
          <button key={p.type} onClick={() => add(p.type)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 hover:border-[#D72027] hover:bg-red-50 text-zinc-700 hover:text-[#D72027] text-sm font-semibold">
            <p.Icon size={15} /> {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function NewsletterEditor({ blocks, onChange, branding, images, monthLabel, header, onHeaderChange }: {
  blocks: Block[]; onChange: (b: Block[]) => void; branding: Branding; images: string[]; monthLabel: string
  header: Header; onHeaderChange: (h: Header) => void
}) {
  const [drag, setDrag] = useState<number | null>(null)
  const add = (type: Block['type']) => onChange([...blocks, blank(type)])
  const upd = (id: string, patch: Partial<Block>) => onChange(blocks.map((b) => b.id === id ? { ...b, ...patch } as Block : b))
  const del = (id: string) => onChange(blocks.filter((b) => b.id !== id))
  const move = (i: number, d: number) => { const a = [...blocks]; const j = i + d; if (j < 0 || j >= a.length) return;[a[i], a[j]] = [a[j]!, a[i]!]; onChange(a) }
  const drop = (i: number) => { if (drag === null || drag === i) return; const a = [...blocks]; const [m] = a.splice(drag, 1); a.splice(i, 0, m!); onChange(a); setDrag(null) }

  return (
    <div className="grid lg:grid-cols-[1fr_400px] gap-5">
      {/* editing column */}
      <div className="space-y-3 min-w-0">
        {/* header banner */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-4">
          <label className="flex items-center gap-2.5 text-sm font-bold text-zinc-800 cursor-pointer"><input type="checkbox" className="w-4 h-4" checked={header.show} onChange={(e) => onHeaderChange({ ...header, show: e.target.checked })} /> Show the red header banner</label>
          {header.show && (
            <div className="mt-3 space-y-2.5">
              <div><span className={fieldLabel}>Banner title</span><input className={inp} value={header.title} onChange={(e) => onHeaderChange({ ...header, title: e.target.value })} placeholder="e.g. Big Star Circus" /></div>
              <div><span className={fieldLabel}>Banner subtitle</span><input className={inp} value={header.subtitle} onChange={(e) => onHeaderChange({ ...header, subtitle: e.target.value })} placeholder="e.g. ★ April 2026 ★" /></div>
            </div>
          )}
        </div>

        {/* add bar (top) */}
        <AddBar add={add} />

        {/* blocks */}
        {blocks.length === 0 && <div className="text-center text-sm text-zinc-400 py-12 border-2 border-dashed border-zinc-200 rounded-2xl">Tap a block above to start building. 🎪</div>}
        {blocks.map((b, i) => {
          const m = META[b.type]
          return (
            <div
              key={b.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => drop(i)}
              className={`bg-white rounded-2xl border p-4 transition-colors ${drag === i ? 'border-[#D72027] opacity-60' : 'border-zinc-200'}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span draggable onDragStart={() => setDrag(i)} onDragEnd={() => setDrag(null)} className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500" title="Drag to reorder"><GripVertical size={16} /></span>
                <m.Icon size={15} className="text-[#D72027]" />
                <span className="text-sm font-extrabold text-zinc-800">{m.label}</span>
                <div className="flex-1" />
                <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1.5 text-zinc-400 hover:text-zinc-800 disabled:opacity-30" title="Move up"><ArrowUp size={15} /></button>
                <button onClick={() => move(i, 1)} disabled={i === blocks.length - 1} className="p-1.5 text-zinc-400 hover:text-zinc-800 disabled:opacity-30" title="Move down"><ArrowDown size={15} /></button>
                <button onClick={() => del(b.id)} className="p-1.5 text-zinc-400 hover:text-red-600" title="Delete block"><Trash2 size={15} /></button>
              </div>
              <BlockEditor block={b} upd={upd} images={images} />
            </div>
          )
        })}

        {/* add bar (bottom) for convenience when the list is long */}
        {blocks.length > 2 && <AddBar add={add} />}
      </div>

      {/* live preview */}
      <div className="lg:sticky lg:top-4 self-start">
        <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-2">👀 Live preview — this is what they'll get</div>
          <Preview blocks={blocks} branding={branding} header={header} />
        </div>
      </div>
    </div>
  )
}

function BlockEditor({ block: b, upd, images }: { block: Block; upd: (id: string, p: Partial<Block>) => void; images: string[] }) {
  if (b.type === 'heading') return <input className={`${inp} font-bold text-base`} value={b.text} onChange={(e) => upd(b.id, { text: e.target.value })} placeholder="Heading" />
  if (b.type === 'text') return (
    <div>
      <AutoTextarea className={inp} value={b.text} onChange={(v) => upd(b.id, { text: v })} placeholder="Write your message here…" />
      <p className="text-[11px] text-zinc-400 mt-1.5">Tip: wrap words in <strong>**stars**</strong> for bold, or __underscores__ to underline.</p>
    </div>
  )
  if (b.type === 'image') return <ImagePick value={b.url} images={images} onPick={(u) => upd(b.id, { url: u })} />
  if (b.type === 'button') return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div><span className={fieldLabel}>Button text</span><input className={inp} value={b.text} onChange={(e) => upd(b.id, { text: e.target.value })} placeholder="e.g. Book now" /></div>
      <div><span className={fieldLabel}>Where it links</span><input className={inp} value={b.url} onChange={(e) => upd(b.id, { url: e.target.value })} placeholder="https://…" /></div>
    </div>
  )
  if (b.type === 'event') return (
    <div className="space-y-2.5">
      <div><span className={fieldLabel}>Event name</span><input className={`${inp} font-bold`} value={b.title} onChange={(e) => upd(b.id, { title: e.target.value })} placeholder="e.g. Kids Night Out" /></div>
      <div><span className={fieldLabel}>Date & time</span><input className={inp} value={b.date} onChange={(e) => upd(b.id, { date: e.target.value })} placeholder="e.g. Saturday 15 August · 5:30–8:30pm" /></div>
      <div><span className={fieldLabel}>Details</span><AutoTextarea className={inp} value={b.blurb} onChange={(v) => upd(b.id, { blurb: v })} placeholder="A line or two about the event…" /></div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><span className={fieldLabel}>Button text</span><input className={inp} value={b.btnText} onChange={(e) => upd(b.id, { btnText: e.target.value })} placeholder="Book now" /></div>
        <div><span className={fieldLabel}>Button link</span><input className={inp} value={b.btnUrl} onChange={(e) => upd(b.id, { btnUrl: e.target.value })} placeholder="https://…" /></div>
      </div>
    </div>
  )
  return <div className="text-xs text-zinc-400 text-center py-2 bg-zinc-50 rounded-lg">— a thin divider line —</div>
}

function ImagePick({ value, images, onPick }: { value: string; images: string[]; onPick: (u: string) => void }) {
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLInputElement | null>(null)
  async function upload(file?: File | null) {
    if (!file) return
    setBusy(true)
    const fd = new FormData(); fd.append('file', file)
    try { const r = await fetch('/api/upload', { method: 'POST', body: fd }); const j = await r.json(); if (j.url) onPick(j.url); else alert(j.error || 'Upload failed') } catch { alert('Upload failed — try again') } finally { setBusy(false) }
  }
  const all = value && !images.includes(value) ? [value, ...images] : images
  return (
    <div className="flex gap-2 flex-wrap items-center">
      {all.map((u) => (
        // eslint-disable-next-line @next/next/no-img-element
        <button key={u} onClick={() => onPick(u)} className={`h-12 w-12 rounded-lg overflow-hidden border-2 ${value === u ? 'border-[#D72027]' : 'border-transparent'}`}><img src={u} alt="" className="h-full w-full object-cover" /></button>
      ))}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      <button onClick={() => ref.current?.click()} disabled={busy} className="h-12 px-3 rounded-lg border-2 border-dashed border-zinc-300 text-xs font-semibold text-zinc-500 hover:border-[#D72027] hover:text-[#D72027] disabled:opacity-50 inline-flex items-center gap-1"><Upload size={13} /> {busy ? 'Uploading…' : 'Upload'}</button>
    </div>
  )
}

function Preview({ blocks, branding, header }: { blocks: Block[]; branding: Branding; header: Header }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,.06)' }}>
      {header.show && (
        <div style={{ background: `linear-gradient(135deg,${branding.primary},#A0151B)`, padding: '20px', textAlign: 'center', color: '#fff' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={branding.logoUrl} alt="" style={{ height: 42, margin: '0 auto 6px', display: 'block' }} />
          {header.title && <div style={{ fontWeight: 800, fontSize: 17 }}>{header.title}</div>}
          {header.subtitle && <div style={{ color: '#ffe08a', fontSize: 12, marginTop: 3 }}>{header.subtitle}</div>}
        </div>
      )}
      <div style={{ padding: 18, fontSize: 13, lineHeight: 1.6, color: '#333' }}>
        {blocks.map((b) => {
          if (b.type === 'heading') return <div key={b.id} style={{ fontWeight: 800, color: '#A0151B', fontSize: 15, margin: '14px 0 6px' }}><RichText text={b.text} /></div>
          if (b.type === 'text') return <p key={b.id} style={{ margin: '0 0 12px', whiteSpace: 'pre-wrap' }}><RichText text={b.text} /></p>
          if (b.type === 'image') return b.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={b.id} src={b.url} alt="" style={{ width: '100%', borderRadius: 10, margin: '0 0 12px' }} />
          ) : <div key={b.id} style={{ background: '#f4f4f5', borderRadius: 10, padding: 24, textAlign: 'center', color: '#bbb', margin: '0 0 12px', fontSize: 12 }}>pick an image →</div>
          if (b.type === 'event') return (
            <div key={b.id} style={{ background: '#1d1340', color: '#fff', borderRadius: 12, padding: 16, textAlign: 'center', margin: '0 0 14px' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{b.title}</div>
              <div style={{ color: '#c9b8ff', fontSize: 12, margin: '4px 0 8px' }}>{b.date}</div>
              <p style={{ fontSize: 12, whiteSpace: 'pre-wrap', margin: b.btnText ? '0 0 12px' : 0 }}><RichText text={b.blurb} /></p>
              {b.btnText && <span style={{ display: 'inline-block', background: branding.accent, color: '#1d1340', fontWeight: 800, fontSize: 13, padding: '9px 22px', borderRadius: 24 }}>{b.btnText}</span>}
            </div>
          )
          if (b.type === 'button') return <div key={b.id} style={{ textAlign: 'center', margin: '0 0 14px' }}><span style={{ display: 'inline-block', background: branding.primary, color: '#fff', fontWeight: 800, fontSize: 13, padding: '10px 24px', borderRadius: 24 }}>{b.text}</span></div>
          return <hr key={b.id} style={{ border: 0, borderTop: '1px solid #eee', margin: '14px 0' }} />
        })}
        <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: '#999' }}>{branding.name} · {branding.phone} · {branding.website}</div>
      </div>
    </div>
  )
}
