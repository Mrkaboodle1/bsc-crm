'use client'

// Client-side header buttons for the site detail page — publish toggle,
// add new page, copy URL, and delete-with-type-to-confirm. Server-side
// page renders these in the DashboardShell's pageActions slot.

import { useState, useTransition } from 'react'
import { createPage, deleteSite, setSitePublished } from '../actions'

export function SiteHeaderActions({
  siteId,
  siteSlug,
  siteName,
  published,
}: {
  siteId: string
  siteSlug: string
  siteName: string
  published: boolean
}) {
  const [isPub, setIsPub] = useState(published)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function togglePublish() {
    const next = !isPub
    setIsPub(next)
    setError(null)
    startTransition(async () => {
      const res = await setSitePublished({ id: siteId, published: next })
      if (!res.ok) { setIsPub(!next); setError(res.error) }
    })
  }

  function copyUrl() {
    const url = `${window.location.origin}/s/${siteSlug}`
    navigator.clipboard?.writeText(url).catch(() => {})
  }

  function handleDelete() {
    const typed = prompt(`This permanently deletes "${siteName}" and every page inside it.\n\nType the site name to confirm:`)
    if (!typed) return
    if (typed.trim().toLowerCase() !== siteName.trim().toLowerCase()) {
      alert("That didn't match. Nothing deleted.")
      return
    }
    startTransition(async () => {
      const res = await deleteSite({ id: siteId })
      if (!res.ok) setError(res.error)
      else window.location.href = '/sites'
    })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={togglePublish}
        className={`text-xs font-extrabold px-3 py-2 rounded-lg ${
          isPub
            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
            : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
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
        href={`/s/${siteSlug}`}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-bold bg-white border border-zinc-200 text-zinc-700 px-3 py-2 rounded-lg hover:bg-zinc-50"
      >
        Preview ↗
      </a>
      <button
        onClick={handleDelete}
        className="text-xs font-bold bg-white border-2 border-red-200 text-red-700 px-3 py-2 rounded-lg hover:bg-red-50"
      >
        🗑 Delete
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  )
}

export function AddPageButton({ siteId }: { siteId: string }) {
  const [pending, startTransition] = useTransition()
  function add() {
    const name = prompt('What\'s this page called? e.g. "About", "Thank you"')
    if (!name?.trim()) return
    startTransition(async () => {
      const res = await createPage({ siteId, name: name.trim() })
      if (res.ok && res.data?.id) {
        window.location.href = `/sites/${siteId}/pages/${res.data.id}/edit`
      } else if (!res.ok) {
        alert(res.error)
      }
    })
  }
  return (
    <button
      onClick={add}
      disabled={pending}
      className="text-xs font-extrabold bg-gradient-to-r from-[#FFC107] to-amber-400 text-zinc-900 px-3 py-1.5 rounded-lg shadow-sm hover:shadow disabled:opacity-50"
    >
      + Add page
    </button>
  )
}
