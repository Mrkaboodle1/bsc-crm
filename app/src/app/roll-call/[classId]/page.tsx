import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { AttendanceGrid, type RosterEntry } from './attendance-grid'
import { markAttendance, awardStar, removeFromClass, searchStudents, addToClass } from './actions'

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

  // 2. Enrolled students (active enrolments only) — now with family + payment
  //    info so the iPad can show parent name, DOB, subscription / Play On status.
  const { data: enrolments } = await supabase
    .from('enrolments')
    .select(`
      id, notes,
      student:students!enrolments_student_id_fkey (
        id, first_name, last_name, date_of_birth, medical_notes, total_stars, star_tier,
        family:families!students_family_id_fkey (
          id, family_name, primary_parent, email, phone, lifecycle_stage, weekly_fee_total, stripe_customer_id
        )
      )
    `)
    .eq('class_id', classId)
    .eq('status', 'active')
    .returns<Array<{
      id: string
      notes: string | null
      student: {
        id: string
        first_name: string
        last_name: string | null
        date_of_birth: string | null
        medical_notes: string | null
        total_stars: number
        star_tier: number
        family: { id: string; family_name: string; primary_parent: string | null; email: string | null; phone: string | null; lifecycle_stage: string | null; weekly_fee_total: number | null; stripe_customer_id: string | null } | null
      }
    }>>()

  // 3. Today's attendance for this class
  const { data: attendance } = await supabase
    .from('attendance')
    .select('id, student_id, status, stars_awarded_today, coach_notes')
    .eq('class_id', classId)
    .eq('date', todayIso)

  const attByStudent = new Map((attendance ?? []).map((a) => [a.student_id, a]))

  const roster: RosterEntry[] = (enrolments ?? []).map((e) => {
    const att = attByStudent.get(e.student.id)
    const fam = Array.isArray(e.student.family) ? e.student.family[0] : e.student.family
    // Derive payment status: roll-sheet commitment text in enrolment.notes
    // is the most specific signal; family lifecycle + weekly_fee_total is the fallback.
    const commitment = (e.notes ?? '').toLowerCase()
    let paymentStatus: RosterEntry['paymentStatus'] = 'unknown'
    if (/play\s*on|playon|\bpo\b/i.test(commitment)) paymentStatus = 'play_on'
    else if (/\bndis\b/i.test(commitment)) paymentStatus = 'ndis'
    else if (/\bcasual\b/i.test(commitment)) paymentStatus = 'casual'
    else if (/^(ft|free trial)$/i.test(commitment.trim())) paymentStatus = 'free_trial'
    else if (/\bsub(scription)?\b/i.test(commitment)) paymentStatus = 'subscribed'
    else if (fam?.lifecycle_stage === 'active' || (fam?.weekly_fee_total ?? 0) > 0) paymentStatus = 'subscribed'
    else if (fam?.lifecycle_stage === 'past' || fam?.lifecycle_stage === 'lost') paymentStatus = 'not_paying'
    return {
      enrolmentId: e.id,
      studentId: e.student.id,
      firstName: e.student.first_name,
      lastName: e.student.last_name,
      dob: e.student.date_of_birth,
      age: yearsOld(e.student.date_of_birth),
      medical: e.student.medical_notes,
      starTier: e.student.star_tier,
      totalStars: e.student.total_stars,
      attendanceId: att?.id ?? null,
      status: (att?.status as RosterEntry['status']) ?? null,
      starsToday: att?.stars_awarded_today ?? 0,
      familyId: fam?.id ?? null,
      familyName: fam?.family_name ?? null,
      primaryParent: fam?.primary_parent ?? null,
      parentEmail: fam?.email ?? null,
      parentPhone: fam?.phone ?? null,
      weeklyFee: fam?.weekly_fee_total ?? 0,
      paymentStatus,
      commitment: e.notes ?? null,
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
        onRemove={removeFromClass}
        onSearch={searchStudents}
        onAdd={addToClass}
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
