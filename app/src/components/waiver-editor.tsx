'use client'

import { useState } from 'react'
import type { Waiver } from '@/lib/waivers'

export function WaiverEditor({ initial, canManage }: { initial: Waiver; canManage: boolean }) {
  const [w, setW] = useState<Waiver>(initial)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const set = (k: keyof Waiver, v: string) => setW((x) => ({ ...x, [k]: v }))
  async function save() {
    setBusy(true); setSaved(false)
    const r = await fetch('/api/waivers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(w) })
    setBusy(false)
    if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500) } else { const j = await r.json().catch(() => ({})); alert(j.error || 'Could not save') }
  }
  const Block = ({ label, k, hint, rows = 5 }: { label: string; k: keyof Waiver; hint: string; rows?: number }) => (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5">
      <div className="font-extrabold text-zinc-900 mb-1">{label}</div>
      <p className="text-xs text-zinc-500 mb-2">{hint}</p>
      <textarea value={w[k]} onChange={(e) => set(k, e.target.value)} rows={rows} disabled={!canManage}
        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none disabled:bg-zinc-50" />
    </div>
  )
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900">
        These three blocks appear on <strong>every booking form</strong> (free trial, Kids Night Out, holiday workshops). Parents tick to agree and type their name to sign.
      </div>
      <Block label="① Liability / safety waiver" k="liability" hint="Parents must tick this to book. Releases Big Star from liability for injury (to the extent allowed by law)." rows={6} />
      <Block label="② Photo & social media consent" k="media" hint="Parents choose Yes/No — does NOT block the booking. Lets you post their child's photos." rows={4} />
      <Block label="③ Emergency medical consent" k="medical" hint="Authorises emergency first aid / medical treatment if you can't reach the parent." rows={3} />
      {canManage && (
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={busy} className="bg-[#D72027] text-white font-extrabold text-sm px-6 py-3 rounded-xl hover:bg-[#A0151B] disabled:opacity-50">{busy ? 'Saving…' : 'Save waiver wording'}</button>
          {saved && <span className="text-sm font-bold text-emerald-600">Saved ✓ — live on all booking forms</span>}
        </div>
      )}
      {!canManage && <p className="text-sm text-zinc-500">Only owners/managers can edit the waiver.</p>}
    </div>
  )
}
