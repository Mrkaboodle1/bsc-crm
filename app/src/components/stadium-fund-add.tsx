'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Put money into the Stadium Fund. Deliberately one-way — there's no
// "take it out" button, because that's the whole point of the fund.
export function StadiumFundAdd() {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function add() {
    const n = parseFloat(amount)
    if (!n || n <= 0) { setMsg('Enter an amount.'); return }
    setBusy(true); setMsg(null)
    const r = await fetch('/api/stadium-fund', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: n, note: note || null }),
    })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setMsg(j.error || 'Could not save that.'); return }
    setAmount(''); setNote(''); setMsg('Added to the fund 🏟️')
    router.refresh()
  }

  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="$ amount"
          className="w-28 px-3 py-2 border-2 border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
          className="flex-1 min-w-[140px] px-3 py-2 border-2 border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none" />
        <button onClick={add} disabled={busy}
          className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm px-4 py-2 rounded-lg disabled:opacity-50">
          {busy ? 'Adding…' : 'Add to fund'}
        </button>
      </div>
      {msg && <div className="mt-2 text-xs font-semibold text-zinc-600">{msg}</div>}
    </div>
  )
}
