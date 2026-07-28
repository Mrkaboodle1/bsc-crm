'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Move, Check } from 'lucide-react'
import { ClassFormButton, type Coach, type ClassRecord } from '@/components/class-form'

// Client-side Roll Call board: same red/yellow weekly poster, but for managers
// it adds (1) an "Arrange" toggle to drag a class onto another day — which
// updates its day automatically — and (2) a small edit/delete pencil on each
// card. Coaches just see tappable cards exactly as before.

export type BoardClass = {
  id: string
  name: string
  day_of_week: number
  start_time: string
  duration_minutes: number
  discipline: string
  age_min: number | null
  age_max: number | null
  capacity: number
  weekly_fee: number | null
  primary_coach_id: string | null
}

type DayMap = Record<number, BoardClass[]>

const DISCIPLINE_EMOJI: Record<string, string> = {
  circus_acro: '🤸', aerial: '🎪', fusion: '✨', drama: '🎭', toddler: '🍼',
  homeschool: '📚', adult: '🏋️', ndis: '💜', private: '🔒', show_programme: '⭐',
}
const PALETTE = [
  { bg: 'bg-gradient-to-br from-[#FF6B73] to-[#D72027]', text: 'text-white', sub: 'text-amber-100', badge: 'bg-amber-200 text-zinc-900' },
  { bg: 'bg-gradient-to-br from-[#FFD54F] to-[#FFC107]', text: 'text-zinc-900', sub: 'text-zinc-800', badge: 'bg-[#D72027] text-white' },
]

function formatTimeRange(start: string, durationMin: number) {
  const [h, m] = start.split(':')
  const startH = parseInt(h, 10), startM = parseInt(m, 10)
  const totalMin = startH * 60 + startM + durationMin
  const endH = Math.floor(totalMin / 60), endM = totalMin % 60
  const fmt = (hh: number, mm: number) => {
    const period = hh >= 12 ? 'pm' : 'am'
    const dh = hh > 12 ? hh - 12 : hh === 0 ? 12 : hh
    return `${dh}:${String(mm).padStart(2, '0')}${period}`
  }
  return `${fmt(startH, startM)}-${fmt(endH, endM)}`
}

export function RollCallBoard({
  days, todayDow, morning, afternoon, enrolled, marked, isManager, coaches,
}: {
  days: { dow: number; name: string }[]
  todayDow: number
  morning: DayMap
  afternoon: DayMap
  enrolled: Record<string, number>
  marked: Record<string, number>
  isManager: boolean
  coaches: Coach[]
}) {
  const router = useRouter()
  const [arrange, setArrange] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overDow, setOverDow] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  async function moveTo(dow: number) {
    const id = dragId
    setOverDow(null); setDragId(null)
    if (!id) return
    setBusy(true); setNote('')
    try {
      const r = await fetch('/api/classes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, day_of_week: dow }),
      })
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'move failed') }
      const dayName = days.find((d) => d.dow === dow)?.name ?? ''
      setNote(`Moved to ${dayName}.`)
      router.refresh()
    } catch {
      setNote('Could not move that class — please try again.')
    } finally { setBusy(false) }
  }

  return (
    <>
      {isManager && (
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => { setArrange((a) => !a); setNote('') }}
            className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border transition-colors ${
              arrange ? 'bg-[#D72027] text-white border-[#D72027]' : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            {arrange ? <Check size={15} /> : <Move size={15} />}
            {arrange ? 'Done arranging' : 'Rearrange days'}
          </button>
          {arrange && <span className="text-sm text-zinc-500">Drag any class onto another day to move it.{busy ? ' Saving…' : ''}</span>}
          {!arrange && note && <span className="text-sm text-emerald-600 font-medium">{note}</span>}
          {arrange && note && <span className="text-sm text-emerald-600 font-medium">{note}</span>}
        </div>
      )}

      <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-[#D72027] bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
        <Band label="Morning" />
        <Grid
          days={days} todayDow={todayDow} byDay={morning} showHeader
          enrolled={enrolled} marked={marked} isManager={isManager} coaches={coaches}
          arrange={arrange} overDow={overDow}
          onDragStartCard={setDragId} onDragOverDay={setOverDow} onDropDay={moveTo}
        />
        <Band label="Afternoon" />
        <Grid
          days={days} todayDow={todayDow} byDay={afternoon} showHeader={false}
          enrolled={enrolled} marked={marked} isManager={isManager} coaches={coaches}
          arrange={arrange} overDow={overDow}
          onDragStartCard={setDragId} onDragOverDay={setOverDow} onDropDay={moveTo}
        />
      </div>

      <div className="text-center mt-4 text-xs text-zinc-400">
        {arrange
          ? 'Arranging mode — tapping a class won’t open the roll. Click “Done arranging” when finished.'
          : 'Each card is tappable — opens that class’s roll for attendance + stars.'}
      </div>
    </>
  )
}

function Band({ label }: { label: string }) {
  return (
    <div className="bg-gradient-to-r from-[#D72027] via-orange-500 to-[#D72027] py-3 px-4 text-center">
      <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide drop-shadow-md">{label}</h2>
    </div>
  )
}

function Grid({
  days, todayDow, byDay, showHeader, enrolled, marked, isManager, coaches,
  arrange, overDow, onDragStartCard, onDragOverDay, onDropDay,
}: {
  days: { dow: number; name: string }[]
  todayDow: number
  byDay: DayMap
  showHeader: boolean
  enrolled: Record<string, number>
  marked: Record<string, number>
  isManager: boolean
  coaches: Coach[]
  arrange: boolean
  overDow: number | null
  onDragStartCard: (id: string) => void
  onDragOverDay: (dow: number | null) => void
  onDropDay: (dow: number) => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-2 sm:p-3">
      {days.map(({ dow, name }) => {
        const list = byDay[dow] ?? []
        const isOver = arrange && overDow === dow
        return (
          <div
            key={`${showHeader ? 'am' : 'pm'}-${dow}`}
            className={`flex flex-col gap-2 min-w-0 rounded-2xl transition-all ${isOver ? 'ring-4 ring-[#D72027] ring-offset-2 bg-white/50' : ''}`}
            onDragOver={arrange ? (e) => { e.preventDefault(); onDragOverDay(dow) } : undefined}
            onDragLeave={arrange ? () => onDragOverDay(null) : undefined}
            onDrop={arrange ? (e) => { e.preventDefault(); onDropDay(dow) } : undefined}
          >
            {showHeader && (
              <div className={`rounded-2xl py-2 px-3 text-center shadow-md border-2 ${
                dow === todayDow
                  ? 'bg-gradient-to-br from-[#FFC107] to-amber-500 text-zinc-900 border-amber-600 ring-2 ring-[#D72027]'
                  : 'bg-gradient-to-br from-amber-300 to-amber-400 text-zinc-900 border-amber-500'
              }`}>
                <div className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider">{name.toUpperCase()}</div>
                {dow === todayDow && <div className="text-[9px] font-bold mt-0.5 text-[#D72027]">TODAY</div>}
              </div>
            )}
            {list.length === 0 ? (
              <div className={`rounded-2xl bg-white/40 border-2 border-dashed px-3 py-6 text-center text-[10px] font-bold ${isOver ? 'border-[#D72027] text-[#D72027]' : 'border-amber-300 text-zinc-400'}`}>
                {isOver ? 'Drop here' : '—'}
              </div>
            ) : (
              list.map((c, i) => (
                <Card
                  key={c.id} cls={c} paletteIndex={i}
                  enrolled={enrolled[c.id] ?? 0} marked={marked[c.id] ?? 0}
                  isManager={isManager} coaches={coaches} arrange={arrange}
                  onDragStart={onDragStartCard}
                />
              ))
            )}
          </div>
        )
      })}
    </div>
  )
}

function Card({
  cls, paletteIndex, enrolled, marked, isManager, coaches, arrange, onDragStart,
}: {
  cls: BoardClass
  paletteIndex: number
  enrolled: number
  marked: number
  isManager: boolean
  coaches: Coach[]
  arrange: boolean
  onDragStart: (id: string) => void
}) {
  const palette = PALETTE[paletteIndex % 2]!
  const emoji = DISCIPLINE_EMOJI[cls.discipline] || '🎪'
  const allMarked = enrolled > 0 && marked >= enrolled
  const someMarked = marked > 0 && marked < enrolled
  const displayName = cls.name.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d{1,2}:\d{2}\s*/i, '').trim() || cls.name
  const editRecord: ClassRecord = {
    id: cls.id, name: cls.name, discipline: cls.discipline, day_of_week: cls.day_of_week,
    start_time: cls.start_time, duration_minutes: cls.duration_minutes, age_min: cls.age_min,
    age_max: cls.age_max, capacity: cls.capacity, weekly_fee: cls.weekly_fee, primary_coach_id: cls.primary_coach_id,
  }

  const inner = (
    <>
      <div className="flex items-start gap-1.5">
        <span className="text-lg sm:text-xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className={`text-[10px] sm:text-xs font-extrabold uppercase tracking-wide leading-tight ${palette.text} line-clamp-2`}>{displayName}</div>
        </div>
      </div>
      {(cls.age_min !== null || cls.age_max !== null) && (
        <div className={`text-[9px] font-bold mt-1.5 uppercase tracking-wider ${palette.sub}`}>Age {cls.age_min ?? '?'}–{cls.age_max ?? '?'}yr</div>
      )}
      <div className={`text-[10px] sm:text-xs font-extrabold mt-1 ${palette.sub}`}>{formatTimeRange(cls.start_time, cls.duration_minutes)}</div>
      <div className="mt-2 flex items-center justify-between gap-1.5">
        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${palette.badge}`}>{enrolled === 0 ? 'EMPTY' : `${marked}/${enrolled}`}</span>
        {allMarked && <span className="text-[10px]">✅</span>}
        {someMarked && <span className="text-[10px]">⏳</span>}
      </div>
    </>
  )

  const editPencil = isManager ? (
    <div className="absolute top-1.5 right-1.5 z-10"><ClassFormButton coaches={coaches} editing={editRecord} iconOnly /></div>
  ) : null

  // Arranging: card is a draggable tile that does NOT navigate on click.
  if (arrange && isManager) {
    return (
      <div
        draggable
        onDragStart={(e) => { onDragStart(cls.id); e.dataTransfer.effectAllowed = 'move' }}
        className={`relative block rounded-2xl ${palette.bg} ${palette.text} px-3 py-3 shadow-md border-2 border-white/30 cursor-grab active:cursor-grabbing ring-2 ring-dashed ring-white/60`}
      >
        {editPencil}
        {inner}
      </div>
    )
  }

  // Normal: tappable link to the roll.
  return (
    <Link
      href={`/roll-call/${cls.id}`}
      className={`relative block rounded-2xl ${palette.bg} ${palette.text} px-3 py-3 shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all border-2 border-white/30`}
    >
      {editPencil}
      {inner}
    </Link>
  )
}
