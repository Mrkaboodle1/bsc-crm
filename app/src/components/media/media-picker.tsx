'use client'

// MediaPicker — tabbed modal for choosing an image. Three tabs:
//   1. Library   — grid of every image this tenant has uploaded / generated
//   2. Upload    — drag-drop or click to pick a file
//   3. AI        — type a prompt, click generate, Pollinations.ai produces an image
//
// Used:
//   - on /media (as the inline panel)
//   - inside the Puck Image field via media-field.tsx
//
// onPick is called when the user clicks an existing item OR finishes
// uploading / generating. The picker then closes itself.

import { useEffect, useRef, useState, useTransition } from 'react'
import { deleteMedia, generateMedia, getAiProviders, listMedia, uploadMedia, type MediaItem } from '@/app/media/actions'

type Tab = 'library' | 'upload' | 'ai'

export function MediaPicker({
  onPick,
  onClose,
  initialTab = 'library',
  embedded = false,
}: {
  onPick: (item: MediaItem) => void
  onClose: () => void
  initialTab?: Tab
  /** When true the picker renders inline (no modal chrome) — used on /media */
  embedded?: boolean
}) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [, startTransition] = useTransition()

  async function refresh(q?: string) {
    setLoading(true)
    setError(null)
    const res = await listMedia({ q })
    setLoading(false)
    if (res.ok) setItems(res.data)
    else setError(res.error)
  }

  useEffect(() => { void refresh() }, [])

  function handlePicked(item: MediaItem) {
    onPick(item)
    if (!embedded) onClose()
  }

  const body = (
    <div className="flex flex-col h-full min-h-[500px]">
      {/* Tabs */}
      <div className="border-b border-zinc-200 px-4 flex items-center gap-1">
        {([
          ['library', '🖼  Library', items.length],
          ['upload',  '⬆  Upload',  null],
          ['ai',      '✨ Generate with AI', null],
        ] as const).map(([id, label, count]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`text-sm font-extrabold px-4 py-3 -mb-px border-b-2 transition-colors ${
              tab === id ? 'border-[#D72027] text-[#D72027]' : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {label}
            {count !== null && count > 0 && (
              <span className="ml-1.5 text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-full">{count}</span>
            )}
          </button>
        ))}
        {!embedded && (
          <button onClick={onClose} className="ml-auto text-zinc-400 hover:text-zinc-900 text-xl leading-none px-2">×</button>
        )}
      </div>

      {error && (
        <div className="m-4 bg-red-50 border-l-4 border-red-400 text-red-800 text-sm px-3 py-2 rounded-r-xl">{error}</div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'library' && (
          <LibraryTab
            items={items}
            loading={loading}
            search={search}
            setSearch={(v) => { setSearch(v); startTransition(() => { void refresh(v) }) }}
            onPick={handlePicked}
            onDeleted={(id) => setItems((cur) => cur.filter((x) => x.id !== id))}
          />
        )}
        {tab === 'upload' && (
          <UploadTab
            onDone={(it) => {
              setItems((cur) => [it, ...cur])
              handlePicked(it)
            }}
          />
        )}
        {tab === 'ai' && (
          <AiTab
            onDone={(it) => {
              setItems((cur) => [it, ...cur])
              handlePicked(it)
            }}
          />
        )}
      </div>
    </div>
  )

  if (embedded) {
    return <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">{body}</div>
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col"
        style={{ maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {body}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Library tab
// ─────────────────────────────────────────────────────────────

function LibraryTab({
  items, loading, search, setSearch, onPick, onDeleted,
}: {
  items: MediaItem[]
  loading: boolean
  search: string
  setSearch: (v: string) => void
  onPick: (it: MediaItem) => void
  onDeleted: (id: string) => void
}) {
  const [pending, startTransition] = useTransition()
  function remove(it: MediaItem) {
    if (!confirm('Delete this image permanently?')) return
    startTransition(async () => {
      const res = await deleteMedia({ id: it.id })
      if (res.ok) onDeleted(it.id)
      else alert(res.error)
    })
  }

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Search by filename, alt text, or AI prompt…"
        className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-sm font-bold focus:border-[#D72027] focus:outline-none"
      />
      {loading ? (
        <div className="text-center py-10 text-sm text-zinc-500">Loading library…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-10">
          <div className="text-5xl mb-2">📸</div>
          <p className="font-extrabold text-zinc-700">No images yet</p>
          <p className="text-sm text-zinc-500 mt-1">Upload one or generate with AI to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => onPick(it)}
              disabled={pending}
              className="group relative bg-zinc-100 rounded-xl overflow-hidden aspect-square border-2 border-transparent hover:border-[#D72027] hover:shadow-md transition-all"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.url} alt={it.alt_text ?? it.filename ?? ''} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-1.5 text-[10px] text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity truncate pointer-events-none">
                {it.source === 'ai' ? `✨ ${it.prompt?.slice(0, 30) ?? 'AI image'}` : (it.filename ?? 'Image')}
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); remove(it) }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); remove(it) } }}
                aria-label="Delete"
                title="Delete"
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/55 text-white text-xs leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 cursor-pointer"
              >
                ×
              </span>
              {it.source === 'ai' && (
                <span className="absolute top-1 left-1 bg-amber-400 text-zinc-900 text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded-full">✨ AI</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Upload tab — drag/drop or click to pick a file
// ─────────────────────────────────────────────────────────────

function UploadTab({ onDone }: { onDone: (it: MediaItem) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressLabel, setProgressLabel] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  async function upload(file: File) {
    setBusy(true)
    setError(null)
    setProgressLabel(`Uploading ${file.name}…`)
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadMedia(fd)
    setBusy(false)
    setProgressLabel(null)
    if (res.ok) onDone(res.data)
    else setError(res.error)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault(); setDragOver(false)
        const f = e.dataTransfer.files?.[0]
        if (f) void upload(f)
      }}
      className={`border-4 border-dashed rounded-3xl p-12 text-center transition-colors ${
        dragOver ? 'border-[#D72027] bg-red-50' : 'border-zinc-300 bg-zinc-50'
      }`}
    >
      <div className="text-6xl mb-3">⬆️</div>
      <p className="text-lg font-extrabold text-zinc-900 mb-1">Drag an image here</p>
      <p className="text-sm text-zinc-500 mb-5">or</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f) }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-6 py-3 rounded-xl shadow-md hover:shadow-lg disabled:opacity-50"
      >
        Choose a file…
      </button>
      {progressLabel && <p className="mt-4 text-xs font-bold text-blue-700">{progressLabel}</p>}
      {error && <p className="mt-4 text-xs font-bold text-red-700">{error}</p>}
      <p className="text-[11px] text-zinc-500 mt-5">PNG, JPG, WebP or GIF up to 10 MB.</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// AI tab — type a prompt, generate, save to library
// ─────────────────────────────────────────────────────────────

function AiTab({ onDone }: { onDone: (it: MediaItem) => void }) {
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ratio, setRatio] = useState<'square' | 'wide' | 'tall'>('square')
  const [provider, setProvider] = useState<'pollinations' | 'openai'>('pollinations')
  const [providers, setProviders] = useState<Array<{ id: 'pollinations' | 'openai'; label: string; available: boolean; cost: string }>>([])

  useEffect(() => {
    void getAiProviders().then((res) => {
      setProviders(res.providers)
      // If OpenAI is wired up, default to it (more reliable than free tier).
      const oa = res.providers.find((p) => p.id === 'openai' && p.available)
      if (oa) setProvider('openai')
    })
  }, [])

  async function generate() {
    if (!prompt.trim()) return
    setBusy(true)
    setError(null)
    const dims = ratio === 'wide' ? { width: 1280, height: 720 } : ratio === 'tall' ? { width: 720, height: 1280 } : { width: 1024, height: 1024 }
    const res = await generateMedia({ prompt: prompt.trim(), provider, ...dims })
    setBusy(false)
    if (res.ok) onDone(res.data)
    else setError(res.error)
  }

  const examples = [
    'A friendly circus coach high-fiving a smiling child in front of a red and yellow striped tent',
    'A vibrant indoor circus studio with colourful trapeze and aerial silks',
    'Watercolour painting of a kids acrobatics class, warm sunset lighting',
    'A young gymnast doing a handstand on a balance beam, photo-realistic',
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1.5">Describe the image you want</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="A friendly circus coach teaching kids how to juggle, bright cheerful lighting…"
          className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-sm font-bold focus:border-[#D72027] focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1.5">Shape</label>
        <div className="flex gap-2">
          {([
            ['square', '🟦 Square (1:1)'],
            ['wide',   '🖼  Wide (16:9)'],
            ['tall',   '📱 Tall (9:16)'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setRatio(id)}
              className={`text-xs font-extrabold px-3 py-2 rounded-lg border-2 ${
                ratio === id ? 'border-[#D72027] bg-red-50 text-[#D72027]' : 'border-zinc-200 text-zinc-700 hover:border-zinc-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1.5">AI engine</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => p.available && setProvider(p.id)}
              disabled={!p.available}
              className={`text-left px-3 py-2 rounded-lg border-2 ${
                !p.available
                  ? 'border-zinc-100 text-zinc-300 cursor-not-allowed bg-zinc-50'
                  : provider === p.id
                    ? 'border-[#D72027] bg-red-50 text-zinc-900'
                    : 'border-zinc-200 text-zinc-700 hover:border-zinc-400'
              }`}
              title={!p.available ? 'Add OPENAI_API_KEY to your env to enable this' : undefined}
            >
              <div className="text-xs font-extrabold">{p.label}</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">{p.cost}{!p.available ? ' · needs API key' : ''}</div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => void generate()}
        disabled={busy || !prompt.trim()}
        className="w-full bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-6 py-3 rounded-xl shadow-md hover:shadow-lg disabled:opacity-50"
      >
        {busy
          ? (provider === 'openai' ? '🎨 OpenAI generating (10–30s)…' : '🎨 Generating (up to 60s, retrying if needed)…')
          : '✨ Generate image'}
      </button>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 text-red-800 text-sm px-3 py-2 rounded-r-xl">
          <div className="font-bold">Generation failed</div>
          <div className="text-xs mt-0.5">{error}</div>
          <button
            onClick={() => void generate()}
            disabled={busy}
            className="mt-2 text-xs font-extrabold bg-white border border-red-300 text-red-700 px-3 py-1 rounded hover:bg-red-100"
          >
            🔁 Try again
          </button>
        </div>
      )}

      <details>
        <summary className="cursor-pointer text-xs font-bold text-zinc-500 hover:text-zinc-900">▸ Try these examples</summary>
        <ul className="mt-2 space-y-1">
          {examples.map((ex, i) => (
            <li key={i}>
              <button
                onClick={() => setPrompt(ex)}
                className="text-left text-xs text-zinc-700 hover:text-[#D72027] hover:underline"
              >
                {ex}
              </button>
            </li>
          ))}
        </ul>
      </details>

      <p className="text-[11px] text-zinc-500">
        Powered by Pollinations.ai (free, no API key). Generations take 5–30 seconds.
      </p>
    </div>
  )
}
