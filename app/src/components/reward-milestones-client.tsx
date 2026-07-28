'use client'

import { useState } from 'react'
import { Gift, Check } from 'lucide-react'

export type DueRow = { id: string; milestone: number; year: number; reachedAt: string; child: string; parent: string | null }

const REWARDS: Record<number, { emoji: string; label: string; reward: string }> = {
  10: { emoji: '📜', label: '10 classes (a term)', reward: 'Certificate + badge' },
  20: { emoji: '🎽', label: '20 classes (half year)', reward: 'Free BSC water bottle or t-shirt' },
  40: { emoji: '🏅', label: '40 classes (full year!)', reward: 'Free Holiday Workshop day + medal at the showcase + 2 weeks free on renewal (one per family)' },
}

export function RewardMilestonesClient({ initial }: { initial: DueRow[] }) {
  const [rows, setRows] = useState<DueRow[]>(initial)
  const [busy, setBusy] = useState<string | null>(null)

  async function markGiven(id: string) {
    setBusy(id)
    const r = await fetch('/api/rewards/milestones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setBusy(null)
    if (r.ok) setRows((xs) => xs.filter((x) => x.id !== id))
    else { const j = await r.json().catch(() => ({})); alert(j.error || 'Could not save') }
  }

  return (
    <div className="space-y-5">
      {/* Ladder reference */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-4">
        <div className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-500 mb-2">The loyalty ladder (resets each year)</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {Object.entries(REWARDS).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-zinc-50 border border-zinc-100 p-3">
              <div className="font-extrabold text-zinc-900 text-sm">{v.emoji} {v.label}</div>
              <div className="text-xs text-zinc-600 mt-1">{v.reward}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Rewards due */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Gift size={16} className="text-[#D72027]" />
          <h3 className="font-extrabold text-zinc-900">Rewards to hand out ({rows.length})</h3>
        </div>
        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-sm text-zinc-500">
            Nothing due right now — milestones appear here automatically as kids hit them on the roll. 🎪
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const m = REWARDS[r.milestone]
              return (
                <li key={r.id} className="bg-white rounded-2xl border-2 border-amber-200 p-4 flex items-center gap-3 flex-wrap">
                  <span className="text-3xl">{m?.emoji || '🎁'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-zinc-900">{r.child} <span className="text-zinc-400 font-normal">· {r.milestone} classes</span></div>
                    {r.parent && <div className="text-xs text-zinc-500">Parent: {r.parent}</div>}
                    <div className="text-sm text-amber-800 font-semibold mt-0.5">🎁 {m?.reward || 'Reward'}</div>
                  </div>
                  <button onClick={() => markGiven(r.id)} disabled={busy === r.id} className="inline-flex items-center gap-1.5 bg-emerald-600 text-white font-extrabold text-sm px-4 py-2.5 rounded-xl disabled:opacity-50 shrink-0">
                    <Check size={16} /> {busy === r.id ? 'Saving…' : 'Mark as given'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
