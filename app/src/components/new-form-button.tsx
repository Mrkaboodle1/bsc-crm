'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

export function NewFormButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function create() {
    setBusy(true)
    try {
      const r = await fetch('/api/forms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'New form' }) })
      const j = await r.json()
      if (r.ok && j.id) { router.push(`/marketing/forms/${j.id}/edit`); return }
    } catch { /* ignore */ }
    setBusy(false)
  }
  return (
    <button onClick={create} disabled={busy} className="inline-flex items-center gap-2 bg-[#D72027] hover:bg-[#A0151B] text-white font-semibold text-sm px-4 py-2 rounded-lg disabled:opacity-50">
      <Plus size={16} /> {busy ? 'Creating…' : 'New form'}
    </button>
  )
}
