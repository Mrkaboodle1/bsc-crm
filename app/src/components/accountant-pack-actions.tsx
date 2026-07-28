'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AccountantPackActions({ month, months, csv, defaultEmail }: { month: string; months: { value: string; label: string }[]; csv: string; defaultEmail: string }) {
  const router = useRouter()
  const [email, setEmail] = useState(defaultEmail)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  function downloadCsv() {
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `BigStar-Accountant-Pack-${month}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function emailIt() {
    setErr(null); setMsg(null); setBusy(true)
    const r = await fetch('/api/finance/accountant-pack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, month }) }).then((x) => x.json()).catch(() => null)
    setBusy(false)
    if (!r?.ok) { setErr(r?.error || 'Could not send.'); return }
    setMsg('Sent to your accountant ✓')
  }

  return (
    <div className="no-print bg-white border border-zinc-200 rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={month} onChange={(e) => router.push(`/finance/accountant-pack?month=${e.target.value}`)} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white">
          {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <button onClick={() => window.print()} className="text-sm font-bold px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white">🖨 Print / Save PDF</button>
        <button onClick={downloadCsv} className="text-sm font-bold px-3 py-2 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-800">⬇ Download CSV</button>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
        <span className="text-sm text-zinc-500">Email to accountant:</span>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="accountant@email.com" className="flex-1 min-w-[180px] border border-zinc-200 rounded-lg px-3 py-2 text-sm" />
        <button onClick={emailIt} disabled={busy} className="text-sm font-bold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">{busy ? 'Sending…' : '✉ Send pack'}</button>
      </div>
      {msg && <div className="text-sm text-emerald-700">{msg}</div>}
      {err && <div className="text-sm text-rose-700">{err}</div>}
    </div>
  )
}
