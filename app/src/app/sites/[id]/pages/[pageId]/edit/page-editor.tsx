'use client'

// Page editor — powered by Puck (https://puckeditor.com).
//
// Puck gives us:
//   - drag-and-drop reorder of blocks
//   - click-to-select with visual handles on the canvas
//   - inline-editable text on most fields
//   - left-rail block palette grouped into categories
//   - right-rail inspector that auto-generates from each block's `fields`
//   - desktop/tablet/mobile viewport switcher (top of the editor)
//   - undo/redo
//   - history persistence
//
// All we add on top:
//   - top toolbar (back, page name, save badge, publish toggle, preview)
//   - autosave (Puck calls onPublish, we wire that to a debounced save)
//   - JSONB <-> Puck adapter so we don't break the existing data shape

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { Puck, type Data } from '@measured/puck'
import '@measured/puck/puck.css'
import { puckConfig } from '@/lib/sites/puck-config'
import { fromPuckData, toPuckData } from '@/lib/sites/puck-adapter'
import type { Block } from '@/lib/sites/blocks'
import { deletePage, savePageBlocks, setPagePublished } from '../../../../actions'

type SavedState = 'saved' | 'dirty' | 'saving' | 'error'

export function PageEditor({
  pageId,
  siteId,
  siteSlug,
  pageSlug,
  initialBlocks,
  initialName,
  initialSeoTitle,
  initialSeoDescription,
  initialPublished,
}: {
  pageId: string
  siteId: string
  siteSlug: string
  pageSlug: string
  initialBlocks: Block[]
  initialName: string
  initialSeoTitle: string
  initialSeoDescription: string
  initialPublished: boolean
}) {
  const [name, setName] = useState(initialName)
  const [seoTitle, setSeoTitle] = useState(initialSeoTitle)
  const [seoDesc, setSeoDesc] = useState(initialSeoDescription)
  const [published, setPublished] = useState(initialPublished)
  const [savedState, setSavedState] = useState<SavedState>('saved')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [seoOpen, setSeoOpen] = useState(false)

  // Latest Puck data is held in a ref + driven through autosave. The Puck
  // component is uncontrolled (initialData only) — that keeps drag/drop
  // performance high.
  const initialPuckData = useRef<Data>(toPuckData(initialBlocks))
  const latestDataRef = useRef<Data>(initialPuckData.current)
  const saveTimeoutRef = useRef<number | null>(null)

  // Debounced save — runs 1.2 s after the last change.
  const scheduleSave = useCallback(() => {
    setSavedState('dirty')
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = window.setTimeout(async () => {
      setSavedState('saving')
      const blocks = fromPuckData(latestDataRef.current)
      const res = await savePageBlocks({
        pageId,
        blocks,
        name,
        seo_title: seoTitle,
        seo_description: seoDesc,
      })
      if (res.ok) setSavedState('saved')
      else { setSavedState('error'); setError(res.error) }
    }, 1200)
  }, [pageId, name, seoTitle, seoDesc])

  // Also re-save when the toolbar fields change (name / SEO).
  useEffect(() => {
    if (savedState === 'saved') return
    scheduleSave()
    // we only want to react to changes once initial render is past
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, seoTitle, seoDesc])

  useEffect(() => () => {
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current)
  }, [])

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
      window.location.href = `/sites/${siteId}`
    })
  }

  async function saveNow() {
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current)
    setSavedState('saving')
    const blocks = fromPuckData(latestDataRef.current)
    const res = await savePageBlocks({
      pageId, blocks, name, seo_title: seoTitle, seo_description: seoDesc,
    })
    if (res.ok) setSavedState('saved')
    else { setSavedState('error'); setError(res.error) }
  }

  const publicUrl = `/s/${siteSlug}${pageSlug ? `/${pageSlug}` : ''}`

  return (
    <div className="bsc-puck-shell">
      <PuckThemeOverrides />

      {/* Top toolbar — sits ABOVE Puck so the user always sees Save / Publish
          and can name the page without diving into Puck's settings. */}
      <header className="bg-white border-b-2 border-zinc-200 px-4 py-2 flex items-center gap-3 flex-wrap sticky top-0 z-30">
        <a href={`/sites/${siteId}`} className="text-xs font-bold text-zinc-500 hover:text-zinc-900">
          ← Back
        </a>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-base font-extrabold text-zinc-900 px-2 py-1 rounded hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none min-w-[180px]"
        />
        <SaveBadge state={savedState} error={error} />

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setSeoOpen(true)}
            className="text-xs font-bold bg-white border border-zinc-200 text-zinc-700 px-3 py-1.5 rounded-lg hover:bg-zinc-50"
          >
            🔍 SEO
          </button>
          <a
            href={`/sites/${siteId}/pages/${pageId}/preview`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold bg-white border border-zinc-200 text-zinc-700 px-3 py-1.5 rounded-lg hover:bg-zinc-50"
          >
            👁 Preview ↗
          </a>
          <button
            onClick={() => void saveNow()}
            disabled={savedState === 'saving'}
            className="text-xs font-bold bg-white border border-zinc-200 text-zinc-700 px-3 py-1.5 rounded-lg hover:bg-zinc-50"
          >
            💾 Save
          </button>
          <button
            onClick={togglePublished}
            disabled={pending}
            className={`text-xs font-extrabold px-3 py-1.5 rounded-lg ${
              published ? 'bg-emerald-500 text-white' : 'bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white shadow'
            }`}
          >
            {published ? '● Live' : 'Publish page'}
          </button>
          <button
            onClick={removePage}
            disabled={pending}
            className="text-xs font-bold bg-white border-2 border-red-200 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50"
          >
            🗑
          </button>
        </div>
      </header>

      {/* The Puck editor itself — left palette + canvas + right inspector */}
      <div className="bsc-puck-canvas">
        <Puck
          config={puckConfig}
          data={initialPuckData.current}
          onChange={(data) => {
            latestDataRef.current = data
            scheduleSave()
          }}
          onPublish={(data) => {
            latestDataRef.current = data
            void saveNow()
          }}
        />
      </div>

      {seoOpen && (
        <SeoModal
          seoTitle={seoTitle}
          setSeoTitle={setSeoTitle}
          seoDesc={seoDesc}
          setSeoDesc={setSeoDesc}
          publicUrl={publicUrl}
          onClose={() => setSeoOpen(false)}
        />
      )}
    </div>
  )
}

function SaveBadge({ state, error }: { state: SavedState; error: string | null }) {
  if (state === 'saved')  return <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">✓ Saved</span>
  if (state === 'dirty')  return <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded">● Unsaved</span>
  if (state === 'saving') return <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded">… Saving</span>
  return <span className="text-[10px] font-extrabold uppercase tracking-wider bg-red-100 text-red-800 px-2 py-0.5 rounded">✕ {error ?? 'Error'}</span>
}

function SeoModal({
  seoTitle, setSeoTitle, seoDesc, setSeoDesc, publicUrl, onClose,
}: {
  seoTitle: string; setSeoTitle: (s: string) => void
  seoDesc: string;  setSeoDesc:  (s: string) => void
  publicUrl: string; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl font-extrabold text-zinc-900">SEO settings</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-zinc-500 mb-3">How this page looks in Google search results.</p>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1">Page title (Google headline)</label>
            <input
              type="text"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="e.g. Big Star Circus — kids circus classes Gold Coast"
              className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-sm font-bold focus:border-[#D72027] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1">Description (Google snippet)</label>
            <textarea
              value={seoDesc}
              rows={3}
              onChange={(e) => setSeoDesc(e.target.value)}
              placeholder="A one-sentence summary that helps people decide to click."
              className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none"
            />
          </div>
          <div className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
            <span className="font-bold">URL:</span> <code className="font-mono">{publicUrl}</code>
          </div>
        </div>
      </div>
    </div>
  )
}

// Inline CSS overrides so Puck's chrome matches our BSC red/yellow palette.
// Kept here to keep all editor styling in one file.
function PuckThemeOverrides() {
  return (
    <style jsx global>{`
      .bsc-puck-shell { display: flex; flex-direction: column; min-height: calc(100vh - 80px); }
      .bsc-puck-canvas { flex: 1; min-height: 600px; }
      /* Puck variables — tweak the accent so buttons / drag previews match BSC red */
      .bsc-puck-canvas {
        --puck-color-azure-04: #D72027;
        --puck-color-azure-05: #D72027;
        --puck-color-azure-06: #A0151B;
        --puck-color-azure-07: #A0151B;
      }
      /* Tighten the editor frame so it fits inside the dashboard shell */
      .bsc-puck-canvas .Puck-root { max-height: none; }
    `}</style>
  )
}
