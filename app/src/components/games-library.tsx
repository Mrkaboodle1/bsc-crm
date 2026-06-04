'use client'

import { useEffect, useMemo, useState } from 'react'

type Game = {
  id: string
  name: string
  summary: string
  categories: string[]
  ageGroups: string[]
  groupSize?: { min?: number; max?: number }
  equipment?: string[]
  setup?: string
  howToPlay?: string
  rules?: string[]
  variations?: string[]
  skills?: string[]
  safety?: string[]
  difficulty?: number
  energy?: number
  tags?: string[]
  programAdaptations?: Record<string, string>
  origin?: string
}

// Monday-anchored key so "played this week" resets every Monday.
function weekKey(): string {
  const d = new Date()
  const day = (d.getDay() + 6) % 7 // 0 = Monday
  d.setDate(d.getDate() - day)
  return d.toISOString().slice(0, 10)
}

const ENERGY = ['', '😴 1', '🙂 2', '⚡ 3', '🔥 4', '🌋 5']

export function GamesLibrary({ games }: { games: Game[] }) {
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState<string>('All')
  const [age, setAge] = useState<string>('All')
  const [open, setOpen] = useState<string | null>(null)
  const [played, setPlayed] = useState<Set<string>>(new Set())
  const wk = weekKey()
  const storeKey = `bsc-games-played-${wk}`

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey)
      if (raw) setPlayed(new Set(JSON.parse(raw)))
    } catch {}
  }, [storeKey])

  function togglePlayed(id: string) {
    setPlayed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      try { localStorage.setItem(storeKey, JSON.stringify([...next])) } catch {}
      return next
    })
  }

  const categories = useMemo(() => ['All', ...Array.from(new Set(games.flatMap((g) => g.categories))).sort()], [games])
  const ages = useMemo(() => ['All', ...Array.from(new Set(games.flatMap((g) => g.ageGroups))).sort()], [games])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return games.filter((g) => {
      if (cat !== 'All' && !g.categories.includes(cat)) return false
      if (age !== 'All' && !g.ageGroups.includes(age)) return false
      if (q && !(`${g.name} ${g.summary} ${(g.tags || []).join(' ')} ${(g.skills || []).join(' ')}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [games, search, cat, age])

  return (
    <div>
      {/* Controls */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-4 mb-4 shadow-sm">
        <input
          type="text"
          placeholder="🔎 Search games, skills or tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl text-base focus:border-[#D72027] focus:outline-none mb-3"
        />
        <Chips label="Type" options={categories} value={cat} onChange={setCat} />
        <Chips label="Age" options={ages} value={age} onChange={setAge} />
        <div className="text-xs text-zinc-500 mt-2">
          {filtered.length} game{filtered.length === 1 ? '' : 's'} · <span className="text-emerald-600 font-semibold">{played.size} played this week</span> (resets Monday)
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((g) => {
          const isPlayed = played.has(g.id)
          const isOpen = open === g.id
          return (
            <div key={g.id} className={`rounded-2xl border shadow-sm overflow-hidden ${isPlayed ? 'border-emerald-300 bg-emerald-50/40' : 'border-zinc-200 bg-white'}`}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-zinc-900 leading-tight">{g.name}</h3>
                    <p className="text-sm text-zinc-600 mt-0.5">{g.summary}</p>
                  </div>
                  {g.origin?.includes('BigStar') && <span className="text-[9px] font-bold uppercase bg-[#FFC107] text-zinc-900 px-1.5 py-0.5 rounded shrink-0">BSC</span>}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {g.categories.map((c) => <span key={c} className="text-[10px] font-semibold bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{c}</span>)}
                  <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Age {g.ageGroups.join(', ')}</span>
                  <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Energy {ENERGY[g.energy || 0]}</span>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => togglePlayed(g.id)}
                    className={`flex-1 text-sm font-bold py-2 rounded-xl transition-colors ${isPlayed ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
                  >
                    {isPlayed ? '✓ Played this week' : 'Mark played this week'}
                  </button>
                  <button
                    onClick={() => setOpen(isOpen ? null : g.id)}
                    className="text-sm font-bold py-2 px-4 rounded-xl bg-[#D72027] text-white"
                  >
                    {isOpen ? 'Hide' : 'How to play'}
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 space-y-3">
                  <Field label="Group size" value={`${g.groupSize?.min ?? '?'}–${g.groupSize?.max ?? '?'} players`} />
                  <Field label="Equipment" value={(g.equipment || []).join(', ') || 'None'} />
                  {g.setup && <Block label="Setup" text={g.setup} />}
                  {g.howToPlay && <Block label="How to play" text={g.howToPlay} />}
                  {!!g.rules?.length && <List label="Rules" items={g.rules} />}
                  {!!g.variations?.length && <List label="Variations" items={g.variations} />}
                  {!!g.skills?.length && <Field label="Skills" value={g.skills.join(', ')} />}
                  {!!g.safety?.length && <List label="⚠️ Safety" items={g.safety} />}
                  {g.programAdaptations && (
                    <div>
                      <div className="font-bold text-zinc-800 mb-1">Adaptations</div>
                      <ul className="list-disc pl-5 space-y-0.5">
                        {Object.entries(g.programAdaptations).map(([k, v]) => <li key={k}><span className="capitalize font-semibold">{k}:</span> {v}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {filtered.length === 0 && <div className="text-center text-zinc-400 py-10">No games match — try clearing a filter.</div>}
    </div>
  )
}

function Chips({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 w-9">{label}</span>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${value === o ? 'bg-[#D72027] text-white border-[#D72027]' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'}`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return <div><span className="font-bold text-zinc-800">{label}:</span> {value}</div>
}
function Block({ label, text }: { label: string; text: string }) {
  return <div><div className="font-bold text-zinc-800">{label}</div><p>{text}</p></div>
}
function List({ label, items }: { label: string; items: string[] }) {
  return <div><div className="font-bold text-zinc-800 mb-1">{label}</div><ul className="list-disc pl-5 space-y-0.5">{items.map((it, i) => <li key={i}>{it}</li>)}</ul></div>
}
