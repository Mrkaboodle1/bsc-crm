import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { AttendanceGrid, type RosterEntry } from './attendance-grid'
import { markAttendance, awardStar } from './actions'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function todayInBrisbane() {
  const now = new Date()
  const brisbane = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Brisbane' }))
  return brisbane.toISOString().slice(0, 10)
}

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h, 10)
  const period = hour >= 12 ? 'pm' : 'am'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}:${m}${period}`
}

export default async function RollCallClassPage({
  params,
}: {
  params: Promise<{ classId: string }>
}) {
  const { classId } = await params
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const todayIso = todayInBrisbane()

  // 1. Class details
  const { data: cls, error: classErr } = await supabase
    .from('classes')
    .select(`
      id, name, day_of_week, start_time, duration_minutes,
      discipline, age_min, age_max, capacity,
      primary_coach:coaches!classes_primary_coach_id_fkey ( id, full_name )
    `)
    .eq('id', classId)
    .maybeSingle()

  if (classErr || !cls) notFound()

  // 2. Enrolled students (active enrolments only)
  const { data: enrolments } = await supabase
    .from('enrolments')
    .select(`
      id,
      student:students!enrolments_student_id_fkey (
        id, first_name, last_name, date_of_birth, medical_notes, total_stars, star_tier
      )
    `)
    .eq('class_id', classId)
    .eq('status', 'active')
    .returns<Array<{ id: string; student: { id: string; first_name: string; last_name: string | null; date_of_birth: string | null; medical_notes: string | null; total_stars: number; star_tier: number } }>>()

  // 3. Today's attendance for this class
  const { data: attendance } = await supabase
    .from('attendance')
    .select('id, student_id, status, stars_awarded_today, coach_notes')
    .eq('class_id', classId)
    .eq('date', todayIso)

  const attByStudent = new Map((attendance ?? []).map((a) => [a.student_id, a]))

  const roster: RosterEntry[] = (enrolments ?? []).map((e) => {
    const att = attByStudent.get(e.student.id)
    return {
      enrolmentId: e.id,
      studentId: e.student.id,
      firstName: e.student.first_name,
      lastName: e.student.last_name,
      age: yearsOld(e.student.date_of_birth),
      medical: e.student.medical_notes,
      starTier: e.student.star_tier,
      totalStars: e.student.total_stars,
      attendanceId: att?.id ?? null,
      status: (att?.status as RosterEntry['status']) ?? null,
      starsToday: att?.stars_awarded_today ?? 0,
    }
  }).sort((a, b) => a.firstName.localeCompare(b.firstName))

  return (
    <DashboardShell
      user={user}
      currentPath="/roll-call"
      pageTitle={cls.name}
      pageSubtitle={`${DAY_NAMES[cls.day_of_week]} · ${formatTime(cls.start_time)} · ${cls.duration_minutes} min · ${Array.isArray(cls.primary_coach) && cls.primary_coach[0]?.full_name ? `Coach ${cls.primary_coach[0].full_name}` : 'No coach set'}`}
      pageActions={
        <a
          href="/roll-call"
          className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
        >
          ← All classes
        </a>
      }
    >
      <AttendanceGrid
        classId={cls.id}
        date={todayIso}
        roster={roster}
        onMark={markAttendance}
        onAward={awardStar}
      />
    </DashboardShell>
  )
}

function yearsOld(dob: string | null): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}
