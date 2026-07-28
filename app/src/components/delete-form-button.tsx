'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export function DeleteFormButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function remove() {
    if (!confirm(`Delete the form "${name}"? Its public link will stop working. This cannot be undone.`)) return
    setBusy(true)
    const r = await fetch(`/api/forms?id=${id}`, { method: 'DELETE' })
    if (r.ok) { router.refresh() } else { setBusy(false); const j = await r.json().catch(() => ({})); alert(j.error || 'Could not delete') }
  }
  return (
    <button
      onClick={remove}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-400 hover:text-red-600 ml-3 disabled:opacity-50"
      aria-label="Delete form"
    >
      <Trash2 size={14} /> {busy ? 'Deleting…' : 'Delete'}
    </button>
  )
}
