'use client'

// Block-based page editor. Two columns:
//   LEFT  : list of blocks, click one to edit its props in a popover
//   RIGHT : live preview using the same <BlockView /> the public page uses
//
// All saves go through the savePageBlocks server action — autosave fires
// 1.5 s after the last change, plus an explicit Save button.

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  BLOCK_LABEL,
  makeBlock,
  type Block,
  type FormField,
} from '@/lib/sites/blocks'
import { BlockView } from '@/components/sites/block-view'
import { deletePage, savePageBlocks, setPagePublished } from '../../../../actions'

type SavedState = 'saved' | 'dirty' | 'saving' | 'error'

export function PageEditor({
  pageId,
  siteSlug,
  pageSlug,
  initialBlocks,
  initialName,
  initialSeoTitle,
  initialSeoDescription,
  initialPublished,
}: {
  pageId: string
  siteSlug: string
  pageSlug: string
  initialBlocks: Block[]
  initialName: string
  initialSeoTitle: string
  initialSeoDescription: string
  initialPublished: boolean
}) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks)
  const [name, setName] = useState(initialName)
  const [seoTitle, setSeoTitle] = useState(initialSeoTitle)
  const [seoDesc, setSeoDesc] = useState(initialSeoDescription)
  const [published, setPublished] = useState(initialPublished)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [savedState, setSavedState] = useState<SavedState>('saved')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const saveTimeoutRef = useRef<number | null>(null)
  const firstRenderRef = useRef(true)

  // ── Autosave ─────────────────────────────────────────────────
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }
    setSavedState('dirty')
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = window.setTimeout(() => {
      void doSave()
    }, 1500)
    return () => { if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, name, seoTitle, seoDesc])

  async function doSave() {
    setSavedState('saving')
    const res = await savePageBlocks({
      pageId,
      blocks,
      name,
      seo_title: seoTitle,
      seo_description: seoDesc,
    })
    if (res.ok) setSavedState('saved')
    else { setSavedState('error'); setError(res.error) }
  }

  function togglePublished() {
    const next = !published
    setPublished(next)
    startTransition(async () => {
      const res = await setPagePublished({ pageId, published: next })
      if (!res.ok) { setPublished(!next); setError(res.error) }
    })
  }

  function removePage() {
    if (!confirm('Delete this page permanently? Cannot be undone.')) return
    startTransition(async () => {
      const res = await deletePage({ pageId })
      if (!res.ok) { setError(res.error); return }
      window.location.href = '/sites'
    })
  }

  // ── Block ops ────────────────────────────────────────────────
  function add(type: Block['type']) {
    const b = makeBlock(type)
    setBlocks((bs) => [...bs, b])
    setSelectedIdx(blocks.length)
  }
  function remove(idx: number) {
    setBlocks((bs) => bs.filter((_, i) => i !== idx))
    setSelectedIdx(null)
  }
  function move(idx: number, dir: -1 | 1) {
    setBlocks((bs) => {
      const next = [...bs]
      const target = idx + dir
      if (target < 0 || target >= next.length) return bs
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
    setSelectedIdx(idx + dir)
  }
  function patchBlock(idx: number, patch: Partial<Block>) {
    setBlocks((bs) => {
      const next = [...bs]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next[idx] = { ...(next[idx] as any), ...(patch as any) }
      return next
    })
  }

  const selected = selectedIdx != null ? blocks[selectedIdx] : null
  const publicUrl = `/s/${siteSlug}${pageSlug ? `/${pageSlug}` : ''}`

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
      {/* LEFT — page settings + blocks list */}
      <aside className="xl:col-span-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
          <SaveBadge state={savedState} error={error} />
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mt-3 mb-1">Page name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-sm font-bold focus:border-[#D72027] focus:outline-none"
          />

          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mt-3 mb-1">URL</label>
          <div className="text-xs font-mono text-zinc-600 bg-zinc-50 border border-zinc-200 rounded px-2 py-1.5 break-all">
            {publicUrl}
          </div>

          <details className="mt-3 group">
            <summary className="cursor-pointer text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 hover:text-zinc-900">
              ▸ SEO
            </summary>
            <div className="mt-2 space-y-2">
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Page title (Google search)"
                className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none"
              />
              <textarea
                value={seoDesc}
                rows={3}
                onChange={(e) => setSeoDesc(e.target.value)}
                placeholder="Description shown in search results"
                className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none"
              />
            </div>
          </details>

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <button
              onClick={togglePublished}
              disabled={pending}
              className={`text-xs font-extrabold px-3 py-1.5 rounded-lg ${
                published ? 'bg-emerald-500 text-white' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
              }`}
            >
              {published ? '● Live' : 'Publish'}
            </button>
            <button
              onClick={() => void doSave()}
              className="text-xs font-bold bg-white border border-zinc-200 text-zinc-700 px-3 py-1.5 rounded-lg hover:bg-zinc-50"
            >
              💾 Save now
            </button>
            <button
              onClick={removePage}
              disabled={pending}
              className="ml-auto text-xs font-bold bg-white border-2 border-red-200 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              🗑 Delete page
            </button>
          </div>
        </div>

        {/* Block palette */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4">
          <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-2">Add block</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(BLOCK_LABEL) as Block['type'][]).map((t) => (
              <button
                key={t}
                onClick={() => add(t)}
                className="px-2 py-1.5 border border-zinc-200 hover:border-[#D72027] hover:bg-red-50 rounded text-[11px] font-bold text-zinc-700"
                title={BLOCK_LABEL[t].label}
              >
                <span className="text-base mr-1">{BLOCK_LABEL[t].icon}</span>
                <span className="hidden md:inline">{BLOCK_LABEL[t].label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Block tree */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4">
          <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-2">Blocks</h3>
          {blocks.length === 0 ? (
            <p className="text-xs text-zinc-500">Add a block to get started.</p>
          ) : (
            <ul className="space-y-1">
              {blocks.map((b, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded border ${
                    selectedIdx === i ? 'border-[#D72027] bg-red-50' : 'border-transparent hover:bg-zinc-50'
                  }`}
                >
                  <button
                    onClick={() => setSelectedIdx(i)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="text-xs font-extrabold text-zinc-800 truncate">
                      <span className="mr-1">{BLOCK_LABEL[b.type].icon}</span>
                      {BLOCK_LABEL[b.type].label}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate">
                      {blockPreviewText(b)}
                    </div>
                  </button>
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => move(i, -1)} className="text-[10px] text-zinc-400 hover:text-zinc-900 leading-none">▲</button>
                    <button onClick={() => move(i, +1)} className="text-[10px] text-zinc-400 hover:text-zinc-900 leading-none">▼</button>
                  </div>
                  <button onClick={() => remove(i)} className="text-zinc-300 hover:text-red-600 text-base leading-none">×</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Inspector for selected block */}
        {selected && selectedIdx != null && (
          <div className="bg-white rounded-2xl shadow-sm border-2 border-[#D72027] p-4">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-[#D72027]">
                Editing: {BLOCK_LABEL[selected.type].label}
              </h3>
              <button onClick={() => setSelectedIdx(null)} className="text-xs text-zinc-400 hover:text-zinc-700">close</button>
            </div>
            <BlockInspector
              block={selected}
              onPatch={(patch) => patchBlock(selectedIdx, patch)}
            />
          </div>
        )}
      </aside>

      {/* RIGHT — live preview */}
      <main className="xl:col-span-8">
        <div className="bg-zinc-100 rounded-2xl p-4 sticky top-2">
          <div className="bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden">
            <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-1.5 flex items-center gap-2 text-xs font-mono text-zinc-500">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="ml-2 truncate">{publicUrl}</span>
            </div>
            <div className="p-5 sm:p-8 space-y-5 min-h-[60vh]">
              {blocks.length === 0 ? (
                <div className="text-center text-zinc-400 py-16">
                  <div className="text-5xl mb-3">🪧</div>
                  <p className="text-sm">Add a block on the left to start designing this page.</p>
                </div>
              ) : (
                blocks.map((b, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedIdx(i)}
                    className={`block w-full text-left rounded-xl transition-shadow ${
                      selectedIdx === i ? 'ring-4 ring-amber-300 ring-offset-2' : 'hover:ring-2 hover:ring-zinc-200 hover:ring-offset-1'
                    }`}
                  >
                    <BlockView block={b} />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function SaveBadge({ state, error }: { state: SavedState; error: string | null }) {
  if (state === 'saved') return <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">✓ Saved</span>
  if (state === 'dirty') return <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded">● Unsaved changes</span>
  if (state === 'saving') return <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded">… Saving</span>
  return <span className="text-[10px] font-extrabold uppercase tracking-wider bg-red-100 text-red-800 px-2 py-0.5 rounded">✕ {error ?? 'Error'}</span>
}

function blockPreviewText(b: Block): string {
  switch (b.type) {
    case 'heading':
    case 'paragraph': return b.text.slice(0, 60)
    case 'image':     return b.alt ?? b.url
    case 'button':    return `${b.text} → ${b.href}`
    case 'spacer':    return `Size ${b.size ?? 'md'}`
    case 'divider':   return 'Horizontal line'
    case 'hero':      return b.title
    case 'features':  return `${b.items.length} items`
    case 'cta':       return b.title
    case 'form':      return `${b.fields.length} fields`
    case 'embed':     return 'HTML embed'
    default:          return ''
  }
}

// ────────────────────────────────────────────────────────────────────
// Inspector — per-block editor UI
// ────────────────────────────────────────────────────────────────────

function BlockInspector({ block, onPatch }: { block: Block; onPatch: (patch: Partial<Block>) => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set = (k: string, v: unknown) => onPatch({ [k]: v } as any)

  switch (block.type) {
    case 'heading':
      return (
        <div className="space-y-2">
          <TextField label="Text" value={block.text} onChange={(v) => set('text', v)} />
          <SelectField label="Level" value={String(block.level ?? 2)} options={[['1', 'H1 (largest)'], ['2', 'H2'], ['3', 'H3']]} onChange={(v) => set('level', Number(v) as 1 | 2 | 3)} />
          <SelectField label="Align" value={block.align ?? 'left'} options={[['left', 'Left'], ['center', 'Center'], ['right', 'Right']]} onChange={(v) => set('align', v as 'left' | 'center' | 'right')} />
        </div>
      )
    case 'paragraph':
      return (
        <div className="space-y-2">
          <TextAreaField label="Text" value={block.text} onChange={(v) => set('text', v)} rows={5} />
          <SelectField label="Align" value={block.align ?? 'left'} options={[['left', 'Left'], ['center', 'Center'], ['right', 'Right']]} onChange={(v) => set('align', v as 'left' | 'center' | 'right')} />
        </div>
      )
    case 'image':
      return (
        <div className="space-y-2">
          <TextField label="Image URL" value={block.url} onChange={(v) => set('url', v)} placeholder="https://..." />
          <TextField label="Alt text" value={block.alt ?? ''} onChange={(v) => set('alt', v)} placeholder="Describe the image" />
          <TextField label="Caption" value={block.caption ?? ''} onChange={(v) => set('caption', v)} placeholder="Optional" />
        </div>
      )
    case 'button':
      return (
        <div className="space-y-2">
          <TextField label="Text" value={block.text} onChange={(v) => set('text', v)} />
          <TextField label="Link" value={block.href} onChange={(v) => set('href', v)} placeholder="/contact or https://..." />
          <SelectField label="Style" value={block.variant ?? 'primary'} options={[['primary', 'Primary (red)'], ['secondary', 'Secondary (yellow)'], ['ghost', 'Ghost (outline)']]} onChange={(v) => set('variant', v as 'primary' | 'secondary' | 'ghost')} />
        </div>
      )
    case 'spacer':
      return (
        <SelectField label="Size" value={block.size ?? 'md'} options={[['sm', 'Small'], ['md', 'Medium'], ['lg', 'Large'], ['xl', 'Extra large']]} onChange={(v) => set('size', v as 'sm' | 'md' | 'lg' | 'xl')} />
      )
    case 'divider':
      return <p className="text-xs text-zinc-500">No options for divider.</p>
    case 'hero':
      return (
        <div className="space-y-2">
          <TextField label="Title" value={block.title} onChange={(v) => set('title', v)} />
          <TextField label="Subtitle" value={block.subtitle ?? ''} onChange={(v) => set('subtitle', v)} />
          <TextField label="Background image" value={block.image ?? ''} onChange={(v) => set('image', v)} placeholder="Optional URL" />
          <TextField label="Button text" value={block.cta?.text ?? ''} onChange={(v) => set('cta', { ...(block.cta ?? { href: '/contact' }), text: v })} />
          <TextField label="Button link" value={block.cta?.href ?? ''} onChange={(v) => set('cta', { ...(block.cta ?? { text: 'Click here' }), href: v })} />
        </div>
      )
    case 'cta':
      return (
        <div className="space-y-2">
          <TextField label="Title" value={block.title} onChange={(v) => set('title', v)} />
          <TextField label="Body" value={block.body ?? ''} onChange={(v) => set('body', v)} />
          <TextField label="Button text" value={block.button.text} onChange={(v) => set('button', { ...block.button, text: v })} />
          <TextField label="Button link" value={block.button.href} onChange={(v) => set('button', { ...block.button, href: v })} />
        </div>
      )
    case 'features':
      return <FeaturesEditor block={block} onPatch={onPatch} />
    case 'form':
      return <FormEditor block={block} onPatch={onPatch} />
    case 'embed':
      return <TextAreaField label="HTML" value={block.html} onChange={(v) => set('html', v)} rows={8} />
    default:
      return <p className="text-xs text-zinc-500">No inspector for this block type yet.</p>
  }
}

function FeaturesEditor({ block, onPatch }: { block: Extract<Block, { type: 'features' }>; onPatch: (p: Partial<Block>) => void }) {
  function patchItem(i: number, patch: Partial<{ icon: string; title: string; body: string }>) {
    const next = [...block.items]
    next[i] = { ...next[i], ...patch }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onPatch({ items: next } as any)
  }
  function add() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onPatch({ items: [...block.items, { icon: '✦', title: 'New feature', body: 'Describe it.' }] } as any)
  }
  function remove(i: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onPatch({ items: block.items.filter((_, x) => x !== i) } as any)
  }
  return (
    <div className="space-y-2">
      <TextField label="Section title" value={block.title ?? ''} onChange={(v) => onPatch({ title: v } as Partial<Block>)} />
      {block.items.map((it, i) => (
        <div key={i} className="bg-zinc-50 border border-zinc-200 rounded-lg p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Item {i + 1}</span>
            <button onClick={() => remove(i)} className="text-zinc-400 hover:text-red-600 text-sm leading-none">×</button>
          </div>
          <TextField label="Icon" value={it.icon ?? ''} onChange={(v) => patchItem(i, { icon: v })} placeholder="🎪" />
          <TextField label="Title" value={it.title} onChange={(v) => patchItem(i, { title: v })} />
          <TextField label="Body" value={it.body} onChange={(v) => patchItem(i, { body: v })} />
        </div>
      ))}
      <button onClick={add} className="w-full border-2 border-dashed border-zinc-300 hover:border-[#D72027] text-zinc-500 hover:text-[#D72027] font-extrabold text-xs py-2 rounded-lg">+ Add feature</button>
    </div>
  )
}

function FormEditor({ block, onPatch }: { block: Extract<Block, { type: 'form' }>; onPatch: (p: Partial<Block>) => void }) {
  function patchField(i: number, patch: Partial<FormField>) {
    const next = [...block.fields]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next[i] = { ...(next[i] as any), ...patch } as FormField
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onPatch({ fields: next } as any)
  }
  function addField() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onPatch({ fields: [...block.fields, { type: 'text', name: 'field', label: 'New field' }] } as any)
  }
  function removeField(i: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onPatch({ fields: block.fields.filter((_, x) => x !== i) } as any)
  }
  return (
    <div className="space-y-2">
      <TextField label="Form title" value={block.title ?? ''} onChange={(v) => onPatch({ title: v } as Partial<Block>)} />
      <TextField label="Submit button label" value={block.submit_label ?? ''} onChange={(v) => onPatch({ submit_label: v } as Partial<Block>)} />
      {block.fields.map((f, i) => (
        <div key={i} className="bg-zinc-50 border border-zinc-200 rounded-lg p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Field {i + 1}</span>
            <button onClick={() => removeField(i)} className="text-zinc-400 hover:text-red-600 text-sm leading-none">×</button>
          </div>
          <SelectField label="Type" value={f.type} options={[['text', 'Text'], ['email', 'Email'], ['phone', 'Phone'], ['textarea', 'Textarea']]} onChange={(v) => patchField(i, { type: v as FormField['type'] })} />
          <TextField label="Name (internal)" value={f.name} onChange={(v) => patchField(i, { name: v })} />
          <TextField label="Label" value={f.label} onChange={(v) => patchField(i, { label: v })} />
          <TextField label="Placeholder" value={f.placeholder ?? ''} onChange={(v) => patchField(i, { placeholder: v })} />
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-700">
            <input type="checkbox" checked={f.required ?? false} onChange={(e) => patchField(i, { required: e.target.checked })} className="w-4 h-4 accent-[#D72027]" />
            Required
          </label>
        </div>
      ))}
      <button onClick={addField} className="w-full border-2 border-dashed border-zinc-300 hover:border-[#D72027] text-zinc-500 hover:text-[#D72027] font-extrabold text-xs py-2 rounded-lg">+ Add field</button>
    </div>
  )
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-0.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2 py-1.5 border border-zinc-200 rounded text-xs focus:border-[#D72027] focus:outline-none"
      />
    </div>
  )
}

function TextAreaField({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-0.5">{label}</label>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 border border-zinc-200 rounded text-xs focus:border-[#D72027] focus:outline-none font-mono"
      />
    </div>
  )
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-0.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 border border-zinc-200 rounded text-xs focus:border-[#D72027] focus:outline-none"
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  )
}

