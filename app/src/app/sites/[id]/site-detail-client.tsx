'use client'

// Client-side site detail. Tabs at the top (Pages · Settings), a sticky
// header strip with Publish/Copy/Preview/Delete buttons, then either:
//   - a grid of page cards (Pages tab), or
//   - a settings panel (Settings tab).
//
// Page cards use a scaled-down <iframe> as the live preview so the cards
// reflect the latest design without us needing screenshot tooling.

import { useState, useTransition } from 'react'
import { PAGE_TEMPLATES } from '@/lib/sites/templates'
import { type SiteKind } from '@/lib/sites/blocks'
import { createPage, deletePage, deleteSite, duplicatePage, setSitePublished } from '../actions'

type Site = {
  id: string; name: string; slug: string; kind: SiteKind;
  description: string | null; is_published: boolean;
  custom_domain: string | null; updated_at: string;
}
type Page = { id: string; name: string; slug: string; is_published: boolean; updated_at: string; position: number }

export function SiteDetailClient({
  site,
  pages,
  activeTab,
}: {
  site: Site
  pages: Page[]
  activeTab: 'pages' | 'settings'
}) {
  const [isPub, setIsPub] = useState(site.is_published)
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [, startTransition] = useTransition()

  function togglePublish() {
    const next = !isPub
    setIsPub(next)
    startTransition(async () => {
      const res = await setSitePublished({ id: site.id, published: next })
      if (!res.ok) { setIsPub(!next); setError(res.error) }
    })
  }
  function copyUrl() {
    const url = `${window.location.origin}/s/${site.slug}`
    navigator.clipboard?.writeText(url).catch(() => {})
  }
  function handleDeleteSite() {
    const typed = prompt(`This permanently deletes "${site.name}" and every page inside.\n\nType the site name to confirm:`)
    if (!typed) return
    if (typed.trim().toLowerCase() !== site.name.trim().toLowerCase()) {
      alert("That didn't match. Nothing deleted.")
      return
    }
    startTransition(async () => {
      const res = await deleteSite({ id: site.id })
      if (!res.ok) setError(res.error)
      else window.location.href = '/sites'
    })
  }

  return (
    <div className="space-y-5">
      {/* Tabs + actions */}
      <div className="flex items-center gap-2 flex-wrap border-b border-zinc-200 pb-3">
        <a
          href={`/sites/${site.id}?tab=pages`}
          className={`text-sm font-extrabold px-4 py-2 rounded-t-lg ${
            activeTab === 'pages' ? 'bg-white border-2 border-zinc-200 border-b-white -mb-[2px] text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          📄 Pages
        </a>
        <a
          href={`/sites/${site.id}?tab=settings`}
          className={`text-sm font-extrabold px-4 py-2 rounded-t-lg ${
            activeTab === 'settings' ? 'bg-white border-2 border-zinc-200 border-b-white -mb-[2px] text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          ⚙️ Settings
        </a>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <button
            onClick={togglePublish}
            className={`text-xs font-extrabold px-3 py-2 rounded-lg ${
              isPub ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            {isPub ? '● Published' : 'Publish site'}
          </button>
          <button
            onClick={copyUrl}
            className="text-xs font-bold bg-white border border-zinc-200 text-zinc-700 px-3 py-2 rounded-lg hover:bg-zinc-50"
          >
            🔗 Copy URL
          </button>
          <a
            href={`/s/${site.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold bg-white border border-zinc-200 text-zinc-700 px-3 py-2 rounded-lg hover:bg-zinc-50"
          >
            Preview ↗
          </a>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 text-red-800 text-sm px-3 py-2 rounded-r-xl">{error}</div>
      )}

      {activeTab === 'pages' ? (
        <PagesGrid
          site={site}
          pages={pages}
          onAdd={() => setPickerOpen(true)}
        />
      ) : (
        <SettingsTab site={site} onDelete={handleDeleteSite} />
      )}

      {pickerOpen && (
        <TemplatePickerModal
          siteId={site.id}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Pages grid — Tectonic-style cards with iframe thumbnails
// ─────────────────────────────────────────────────────────────

function PagesGrid({ site, pages, onAdd }: { site: Site; pages: Page[]; onAdd: () => void }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-extrabold text-zinc-900">{pages.length} {pages.length === 1 ? 'page' : 'pages'}</h2>
        <button
          onClick={onAdd}
          className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-4 py-2 rounded-lg shadow-md hover:shadow-lg"
        >
          + Add new page
        </button>
      </div>
      {pages.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-zinc-200 p-10 text-center">
          <div className="text-5xl mb-2">🪧</div>
          <p className="font-extrabold text-zinc-700">No pages yet</p>
          <p className="text-sm text-zinc-500 mt-1 mb-4">Add a page using a template to start designing.</p>
          <button
            onClick={onAdd}
            className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg"
          >
            + Add your first page
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {pages.map((p) => (
            <PageCard key={p.id} site={site} page={p} />
          ))}
        </div>
      )}
    </div>
  )
}

function PageCard({ site, page }: { site: Site; page: Page }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const previewPath = `/s/${site.slug}${page.slug ? `/${page.slug}` : ''}`
  const editPath = `/sites/${site.id}/pages/${page.id}/edit`

  function dup() {
    setMenuOpen(false)
    startTransition(async () => {
      const res = await duplicatePage({ pageId: page.id })
      if (res.ok && res.data?.id) {
        window.location.href = `/sites/${site.id}/pages/${res.data.id}/edit`
      } else if (!res.ok) {
        alert(res.error)
      }
    })
  }
  function del() {
    setMenuOpen(false)
    if (!confirm(`Delete "${page.name}" permanently?`)) return
    startTransition(async () => {
      const res = await deletePage({ pageId: page.id })
      if (!res.ok) alert(res.error)
      else window.location.reload()
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between gap-2 border-b border-zinc-100">
        <a href={editPath} className="font-extrabold text-zinc-900 hover:text-[#D72027] truncate flex-1 min-w-0">
          {page.name}
        </a>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-6 h-6 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 leading-none flex items-center justify-center"
            aria-label="More options"
          >
            ⋯
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-7 z-20 bg-white border border-zinc-200 rounded-xl shadow-xl py-1 w-44">
                <a href={editPath} className="block px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50">✏️ Edit</a>
                <a href={previewPath} target="_blank" rel="noreferrer" className="block px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50">👁 Preview ↗</a>
                <button onClick={dup} disabled={pending} className="block w-full text-left px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50">📋 Duplicate</button>
                <button onClick={del} disabled={pending} className="block w-full text-left px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">🗑 Delete</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Thumbnail — scaled iframe of the AUTHENTICATED preview route so it
          works for unpublished pages too. Scaled hard so the whole page
          fits inside the card. */}
      <a href={editPath} className="block relative bg-zinc-50 overflow-hidden" style={{ aspectRatio: '16 / 11' }}>
        <iframe
          src={`/sites/${site.id}/pages/${page.id}/preview`}
          title={page.name}
          loading="lazy"
          className="absolute origin-top-left border-0 pointer-events-none"
          style={{
            width: '1280px',
            height: '900px',
            transform: 'scale(0.32)',
            transformOrigin: 'top left',
          }}
          tabIndex={-1}
        />
        {/* Click-through overlay so anywhere on the thumbnail opens the
            editor. The iframe is pointer-events:none so it can't steal it. */}
        <div className="absolute inset-0 hover:bg-zinc-900/0 transition-colors" />
        {page.is_published ? (
          <span className="absolute top-2 left-2 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow">● Live</span>
        ) : (
          <span className="absolute top-2 left-2 text-[10px] font-extrabold uppercase tracking-wider bg-zinc-700 text-white px-2 py-0.5 rounded-full shadow">Draft</span>
        )}
      </a>

      {/* Footer with Edit button */}
      <div className="px-3 py-2.5 flex items-center justify-between bg-zinc-50 border-t border-zinc-100">
        <span className="text-[10px] font-mono text-zinc-400 truncate">
          /{page.slug || '(home)'}
        </span>
        <a
          href={editPath}
          className="bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-xs px-3 py-1.5 rounded-lg"
        >
          Edit
        </a>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Template picker modal — first step when adding a new page
// ─────────────────────────────────────────────────────────────

function TemplatePickerModal({ siteId, onClose }: { siteId: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function pick(templateId: string) {
    setError(null)
    startTransition(async () => {
      const res = await createPage({ siteId, templateId })
      if (res.ok && res.data?.id) {
        window.location.href = `/sites/${siteId}/pages/${res.data.id}/edit`
      } else if (!res.ok) {
        setError(res.error)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-zinc-100 flex items-baseline justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-zinc-900">Pick a starting point</h2>
            <p className="text-xs text-zinc-500">We'll set up the page with a sensible starting design — edit anything you want after.</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 text-xl leading-none">×</button>
        </div>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 text-red-800 text-sm px-3 py-2 mx-6 mt-4 rounded-r-xl">{error}</div>
        )}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PAGE_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              disabled={pending}
              className="bg-white border-2 border-zinc-200 hover:border-[#D72027] hover:bg-red-50 rounded-2xl p-4 text-left transition-colors disabled:opacity-60"
            >
              <div className="text-4xl mb-2">{t.icon}</div>
              <div className="font-extrabold text-zinc-900">{t.name}</div>
              <div className="text-xs text-zinc-500 mt-1 leading-snug">{t.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Settings tab
// ─────────────────────────────────────────────────────────────

function SettingsTab({ site, onDelete }: { site: Site; onDelete: () => void }) {
  const publicUrl = `/s/${site.slug}`
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl">
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
        <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-2">Public URL</h3>
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm font-mono text-zinc-700 break-all">
          {publicUrl}
        </div>
        {site.custom_domain && (
          <div className="mt-3 text-xs">
            <span className="text-zinc-500">Custom domain:</span>{' '}
            <span className="font-bold text-zinc-800">{site.custom_domain}</span>
          </div>
        )}
        <p className="text-[11px] text-zinc-400 mt-3">Custom domain support coming in the next iteration.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
        <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-2">About</h3>
        <p className="text-sm text-zinc-700">{site.description ?? <span className="text-zinc-400">No description set.</span>}</p>
        <p className="text-[11px] text-zinc-400 mt-3">
          Last updated: {new Date(site.updated_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border-2 border-red-200 p-5 lg:col-span-2">
        <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-red-700 mb-2">Danger zone</h3>
        <p className="text-sm text-zinc-700 mb-3">Permanently delete this site and every page inside. Cannot be undone.</p>
        <button
          onClick={onDelete}
          className="bg-white border-2 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-500 font-extrabold text-sm px-4 py-2 rounded-xl"
        >
          🗑 Delete this site
        </button>
      </div>
    </div>
  )
}
