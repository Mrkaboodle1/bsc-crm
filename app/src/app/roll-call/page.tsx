import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { ClassFormButton, type Coach } from '@/components/class-form'
import { CoachClock } from '@/components/coach-clock'
import { RollCallBoard, type BoardClass } from '@/components/roll-call-board'
import { Printer } from 'lucide-react'

// /roll-call mirrors the BSC weekly-schedule poster — Mon→Sat columns, Morning
// + Afternoon bands, alternating red/yellow cards. Managers can drag a class to
// another day (auto-updates) and edit/delete via the per-card pencil. The
// interactive board lives in components/roll-call-board.tsx; this file fetches.

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
// schema: 0=Sun..6=Sat. Sunday excluded — BSC runs no Sunday classes.
const DAY_INDEX_FROM_SCHEMA = [1, 2, 3, 4, 5, 6]

function todayInBrisbane() {
  const now = new Date()
  const brisbane = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Brisbane' }))
  return { dow: brisbane.getDay(), iso: brisbane.toISOString().slice(0, 10) }
}

type ClassRow = BoardClass & {
  primary_coach: { full_name: string }[] | { full_name: string } | null
}

export default async function RollCallIndexPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { dow: todayDow, iso } = todayInBrisbane()

  // Coaches only see the classes they teach. Owners/managers see every class.
  let coachFilterId: string | null = null
  let hidePrivate = false
  if (user.role === 'coach') {
    const { data: coachRow } = await supabase
      .from('coaches')
      .select('id, role')
      .eq('user_id', user.id)
      .maybeSingle()
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
      discipline, age_min, age_max, capacity, weekly_fee, primary_coach_id,
      primary_coach:coaches!classes_primary_coach_id_fkey ( full_name )
    `)
    .eq('status', 'active')
  if (coachFilterId) classQuery = classQuery.eq('primary_coach_id', coachFilterId)
  if (hidePrivate) classQuery = classQuery.neq('discipline', 'private')
  const { data: classes } = await classQuery
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })
    .returns<ClassRow[]>()

  // Managers can add/edit/move/delete classes; coaches just take the roll.
  const isManager = user.role === 'owner' || user.role === 'manager'
  let coachList: Coach[] = []
  if (isManager) {
    const { data: cs } = await supabase.from('coaches').select('id, full_name').order('full_name').returns<Coach[]>()
    coachList = cs ?? []
  }

  // Enrolment + attendance counts for the card badges.
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

  // Split into morning (before 12:00) / afternoon (12:00+), grouped by day.
  const strip = (c: ClassRow): BoardClass => ({
    id: c.id, name: c.name, day_of_week: c.day_of_week, start_time: c.start_time,
    duration_minutes: c.duration_minutes, discipline: c.discipline, age_min: c.age_min,
    age_max: c.age_max, capacity: c.capacity, weekly_fee: c.weekly_fee, primary_coach_id: c.primary_coach_id,
  })
  const morning: Record<number, BoardClass[]> = {}
  const afternoon: Record<number, BoardClass[]> = {}
  for (const dow of DAY_INDEX_FROM_SCHEMA) { morning[dow] = []; afternoon[dow] = [] }
  for (const c of classes ?? []) {
    if (!DAY_INDEX_FROM_SCHEMA.includes(c.day_of_week)) continue
    const h = parseInt(c.start_time.split(':')[0]!, 10)
    ;(h < 12 ? morning : afternoon)[c.day_of_week]!.push(strip(c))
  }

  const days = DAY_INDEX_FROM_SCHEMA.map((dow, idx) => ({ dow, name: DAYS[idx]! }))

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
      {/* Time clock — opening the roll on the iPad clocks the coach on. */}
      <CoachClock />
      <RollCallBoard
        days={days}
        todayDow={todayDow}
        morning={morning}
        afternoon={afternoon}
        enrolled={enrolByClass}
        marked={attByClass}
        isManager={isManager}
        coaches={coachList}
      />
    </DashboardShell>
  )
}
