'use client'
// Tiny edit/delete button pair for list rows. Edit navigates to the record's
// editor page; delete confirms then calls `DELETE {deleteUrl}` and refreshes.
// One component so every list in the CRM gets the identical pattern.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'

export function RowActions({ editHref, deleteUrl, deleteAction, confirmText, className }: {
  editHref?: string
  deleteUrl?: string
  /** Server action alternative to deleteUrl, pre-bound to the record id. */
  deleteAction?: () => Promise<{ ok: boolean; error?: string }>
  confirmText?: string
  className?: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function remove(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    if (!deleteUrl && !deleteAction) return
    if (!confirm(confirmText || 'Delete this record? This cannot be undone.')) return
    setBusy(true)
    try {
      if (deleteAction) {
        const res = await deleteAction()
        if (!res.ok) { alert(res.error || 'Could not delete'); return }
      } else {
        const r = await fetch(deleteUrl!, { method: 'DELETE' })
        const j = await r.json().catch(() => ({}))
        if (!r.ok) { alert(j.error || 'Could not delete'); return }
      }
      router.refresh()
    } finally { setBusy(false) }
  }

  return (
    <span className={`inline-flex items-center gap-0.5 ${className || ''}`} onClick={(e) => e.stopPropagation()}>
      {editHref && (
        <a href={editHref} title="Edit" className="p-1.5 rounded-md text-zinc-400 hover:text-blue-600 hover:bg-blue-50" onClick={(e) => e.stopPropagation()}>
          <Pencil size={14} />
        </a>
      )}
      {(deleteUrl || deleteAction) && (
        <button onClick={remove} disabled={busy} title="Delete" className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40">
          <Trash2 size={14} />
        </button>
      )}
    </span>
  )
}
