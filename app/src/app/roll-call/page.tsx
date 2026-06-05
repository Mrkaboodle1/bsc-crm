import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { ClassFormButton, type Coach } from '@/components/class-form'
import { Printer } from 'lucide-react'

// /roll-call now mirrors the BSC weekly-schedule poster — Mon→Sun columns,
// Morning + Afternoon row bands, alternating red/yellow class cards. Each
// card is a button that opens the class roll on iPad.

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
// In our schema: 0=Sun, 1=Mon...6=Sat. Reorder to start with Monday. Sunday
// is intentionally excluded — BSC doesn't run classes on Sundays, so it just
// looked like a long row of "empty" cards before. If that changes, add 0
// back to the list and "Sunday" to DAYS.
const DAY_INDEX_FROM_SCHEMA = [1, 2, 3, 4, 5, 6]

function todayInBrisbane() {
  const now = new Date()
  const brisbane = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Brisbane' }))
  return { dow: brisbane.getDay(), iso: brisbane.toISOString().slice(0, 10) }
}

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h, 10)
  const period = hour >= 12 ? 'pm' : 'am'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}:${m}${period}`
}

function formatTimeRange(start: string, durationMin: number) {
  const [h, m] = start.split(':')
  const startH = parseInt(h, 10)
  const startM = parseInt(m, 10)
  const totalMin = startH * 60 + startM + durationMin
  const endH = Math.floor(totalMin / 60)
  const endM = totalMin % 60
  const fmt = (hh: number, mm: number) => {
    const period = hh >= 12 ? 'pm' : 'am'
    const dh = hh > 12 ? hh - 12 : hh === 0 ? 12 : hh
    return `${dh}:${String(mm).padStart(2, '0')}${period}`
  }
  return `${fmt(startH, startM)}-${fmt(endH, endM)}`
}

type ClassRow = {
  id: string
  name: string
  day_of_week: number
  start_time: string
  duration_minutes: number
  discipline: string
  age_min: number | null
  age_max: number | null
  capacity: number
  primary_coach: { full_name: string }[] | { full_name: string } | null
}

export default async function RollCallIndexPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { dow: todayDow, iso } = todayInBrisbane()

  // Coaches only see the classes they teach. Owners/managers see every class.
  // (Find the coach record linked to this login, then filter classes to it.)
  let coachFilterId: string | null = null
  let hidePrivate = false
  if (user.role === 'coach') {
    const { data: coachRow } = await supabase
      .from('coaches')
      .select('id, role')
      .eq('user_id', user.id)
      .maybeSingle()
    // Lead coach (coach role 'head') sees EVERY class, Mon–Sat, including the
    // private lessons. Other coaches see only the classes assigned to them, and
    // NEVER the private lessons. If somehow unlinked, show nothing.
    if (!coachRow) {
      coachFilterId = '00000000-0000-0000-0000-000000000000'
    } else if (coachRow.role !== 'head') {
      coachFilterId = coachRow.id
      hidePrivate = true
    }
  }

  let classQuery = supabase
    .from('classes')
    .select(`
      id, name, day_of_week, start_time, duration_minutes,
      discipline, age_min, age_max, capacity,
      primary_coach:coaches!classes_primary_coach_id_fkey ( full_name )
    `)
    .eq('status', 'active')
  if (coachFilterId) classQuery = classQuery.eq('primary_coach_id', coachFilterId)
  if (hidePrivate) classQuery = classQuery.neq('discipline', 'private')
  const { data: classes } = await classQuery
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })
    .returns<ClassRow[]>()

  // Managers can add/edit classes from here; coaches just take the roll.
  const isManager = user.role === 'owner' || user.role === 'manager'
  let coachList: Coach[] = []
  if (isManager) {
    const { data: cs } = await supabase.from('coaches').select('id, full_name').order('full_name').returns<Coach[]>()
    coachList = cs ?? []
  }

  // Enrolment counts (so cards can show "5 / 8 here")
  const classIds = (classes ?? []).map((c) => c.id)
  let enrolByClass: Record<string, number> = {}
  let attByClass: Record<string, number> = {}
  if (classIds.length > 0) {
    const [{ data: enrols }, { data: atts }] = await Promise.all([
      supabase.from('enrolments').select('class_id').eq('status', 'active').in('class_id', classIds),
      supabase.from('attendance').select('class_id').eq('date', iso).in('class_id', classIds),
    ])
    enrolByClass = (enrols ?? []).reduce<Record<string, number>>((acc, r) => { acc[r.class_id] = (acc[r.class_id] ?? 0) + 1; return acc }, {})
    attByClass = (atts ?? []).reduce<Record<string, number>>((acc, r) => { acc[r.class_id] = (acc[r.class_id] ?? 0) + 1; return acc }, {})
  }

  // Split into morning (before 12:00) and afternoon (12:00+), grouped by day-of-week
  type DayBucket = { morning: ClassRow[]; afternoon: ClassRow[] }
  const empty = (): DayBucket => ({ morning: [], afternoon: [] })
  const grid: Record<number, DayBucket> = { 0: empty(), 1: empty(), 2: empty(), 3: empty(), 4: empty(), 5: empty(), 6: empty() }
  for (const c of classes ?? []) {
    const h = parseInt(c.start_time.split(':')[0]!, 10)
    const bucket = h < 12 ? 'morning' : 'afternoon'
    grid[c.day_of_week]![bucket].push(c)
  }

  return (
    <DashboardShell
      user={user}
      currentPath="/roll-call"
      pageTitle="Roll Call"
      pageSubtitle="Tap a class to start the roll."
      pageActions={
        <>
          <a href="/roll-call/print" target="_blank" className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-zinc-50">
            <Printer size={15} /> Print / Download
          </a>
          {isManager && <ClassFormButton coaches={coachList} />}
        </>
      }
    >
      <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-[#D72027] bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">

        {/* MORNING band */}
        <BandHeader label="Morning" />

        {/* Day columns — morning row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-2 sm:p-3">
          {DAY_INDEX_FROM_SCHEMA.map((dow, idx) => (
            <DayColumn key={`am-${dow}`} dow={dow} dayName={DAYS[idx]!} isToday={dow === todayDow}>
              {grid[dow]!.morning.length === 0 ? (
                <EmptyCard />
              ) : (
                grid[dow]!.morning.map((c, i) => (
                  <ClassCard
                    key={c.id}
                    cls={c}
                    paletteIndex={i}
                    enrolled={enrolByClass[c.id] ?? 0}
                    marked={attByClass[c.id] ?? 0}
                  />
                ))
              )}
            </DayColumn>
          ))}
        </div>

        {/* AFTERNOON band */}
        <BandHeader label="Afternoon" />

        {/* Day columns — afternoon row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-2 sm:p-3">
          {DAY_INDEX_FROM_SCHEMA.map((dow, idx) => (
            <DayColumn key={`pm-${dow}`} dow={dow} dayName={DAYS[idx]!} isToday={dow === todayDow} hideHeader>
              {grid[dow]!.afternoon.length === 0 ? (
                <EmptyCard />
              ) : (
                grid[dow]!.afternoon.map((c, i) => (
                  <ClassCard
                    key={c.id}
                    cls={c}
                    paletteIndex={i}
                    enrolled={enrolByClass[c.id] ?? 0}
                    marked={attByClass[c.id] ?? 0}
                  />
                ))
              )}
            </DayColumn>
          ))}
        </div>

      </div>

      <div className="text-center mt-4 text-xs text-zinc-400">
        Each card is tappable — opens that class&apos;s roll for attendance + stars.
      </div>
    </DashboardShell>
  )
}

function BandHeader({ label }: { label: string }) {
  return (
    <div className="bg-gradient-to-r from-[#D72027] via-orange-500 to-[#D72027] py-3 px-4 text-center">
      <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide drop-shadow-md">
        {label}
      </h2>
    </div>
  )
}

function DayColumn({
  dow,
  dayName,
  isToday,
  hideHeader = false,
  children,
}: {
  dow: number
  dayName: string
  isToday: boolean
  hideHeader?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 min-w-0">
      {!hideHeader && (
        <div
          className={`rounded-2xl py-2 px-3 text-center shadow-md border-2 ${
            isToday
              ? 'bg-gradient-to-br from-[#FFC107] to-amber-500 text-zinc-900 border-amber-600 ring-2 ring-[#D72027]'
              : 'bg-gradient-to-br from-amber-300 to-amber-400 text-zinc-900 border-amber-500'
          }`}
        >
          <div className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider">
            {dayName.toUpperCase()}
          </div>
          {isToday && <div className="text-[9px] font-bold mt-0.5 text-[#D72027]">TODAY</div>}
        </div>
      )}
      {children}
    </div>
  )
}

// Discipline → emoji for the card
const DISCIPLINE_EMOJI: Record<string, string> = {
  circus_acro: '🤸',
  aerial: '🎪',
  fusion: '✨',
  drama: '🎭',
  toddler: '🍼',
  homeschool: '📚',
  adult: '🏋️',
  ndis: '💜',
  private: '🔒',
  show_programme: '⭐',
}

// Alternating red/yellow palette matching BSC's poster
const PALETTE = [
  // Red card
  {
    bg: 'bg-gradient-to-br from-[#FF6B73] to-[#D72027]',
    text: 'text-white',
    sub: 'text-amber-100',
    badge: 'bg-amber-200 text-zinc-900',
  },
  // Yellow card
  {
    bg: 'bg-gradient-to-br from-[#FFD54F] to-[#FFC107]',
    text: 'text-zinc-900',
    sub: 'text-zinc-800',
    badge: 'bg-[#D72027] text-white',
  },
]

function ClassCard({
  cls,
  paletteIndex,
  enrolled,
  marked,
}: {
  cls: ClassRow
  paletteIndex: number
  enrolled: number
  marked: number
}) {
  const palette = PALETTE[paletteIndex % 2]!
  const emoji = DISCIPLINE_EMOJI[cls.discipline] || '🎪'
  const allMarked = enrolled > 0 && marked >= enrolled
  const someMarked = marked > 0 && marked < enrolled
  // Show a cleaner display name: strip any "Mon "/"Tue " prefix since the column gives that context
  const displayName = cls.name.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d{1,2}:\d{2}\s*/i, '').trim() || cls.name
  return (
    <a
      href={`/roll-call/${cls.id}`}
      className={`block rounded-2xl ${palette.bg} ${palette.text} px-3 py-3 shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all border-2 border-white/30`}
    >
      <div className="flex items-start gap-1.5">
        <span className="text-lg sm:text-xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className={`text-[10px] sm:text-xs font-extrabold uppercase tracking-wide leading-tight ${palette.text} line-clamp-2`}>
            {displayName}
          </div>
        </div>
      </div>
      {(cls.age_min !== null || cls.age_max !== null) && (
        <div className={`text-[9px] font-bold mt-1.5 uppercase tracking-wider ${palette.sub}`}>
          Age {cls.age_min ?? '?'}–{cls.age_max ?? '?'}yr
        </div>
      )}
      <div className={`text-[10px] sm:text-xs font-extrabold mt-1 ${palette.sub}`}>
        {formatTimeRange(cls.start_time, cls.duration_minutes)}
      </div>
      <div className="mt-2 flex items-center justify-between gap-1.5">
        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${palette.badge}`}>
          {enrolled === 0 ? 'EMPTY' : `${marked}/${enrolled}`}
        </span>
        {allMarked && <span className="text-[10px]">✅</span>}
        {someMarked && <span className="text-[10px]">⏳</span>}
      </div>
    </a>
  )
}

function EmptyCard() {
  return (
    <div className="rounded-2xl bg-white/40 border-2 border-dashed border-amber-300 px-3 py-6 text-center text-[10px] text-zinc-400 font-bold">
      —
    </div>
  )
}
