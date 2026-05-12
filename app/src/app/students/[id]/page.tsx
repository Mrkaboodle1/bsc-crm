import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { StudentProfileView, type StudentProfile } from '@/components/student-profile-view'

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await verifySession()
  const supabase = await createServerSupabase()

  // 1. Student + family
  const { data: stu, error: stuErr } = await supabase
    .from('students')
    .select(`
      id, first_name, last_name, date_of_birth, medical_notes, photo_consent,
      photo_consent_date, blue_card_number, blue_card_expiry,
      total_stars, star_tier, trainee_status,
      family:families!students_family_id_fkey (id, family_name, primary_parent, email, phone, lifecycle_stage)
    `)
    .eq('id', id)
    .maybeSingle()

  if (stuErr || !stu) notFound()

  // 2. Star ledger
  const { data: ledger } = await supabase
    .from('star_ledger')
    .select(`
      id, stars, reason, notes, awarded_at,
      coach:coaches!star_ledger_awarded_by_coach_id_fkey (full_name)
    `)
    .eq('student_id', id)
    .order('awarded_at', { ascending: false })

  // 3. Active enrolments
  const { data: enrolments } = await supabase
    .from('enrolments')
    .select(`
      id, start_date, end_date, status, weekly_fee, term,
      class:classes!enrolments_class_id_fkey (id, name, day_of_week, start_time, discipline)
    `)
    .eq('student_id', id)
    .order('start_date', { ascending: false })

  // 4. Last N attendance entries
  const { data: attendance } = await supabase
    .from('attendance')
    .select(`
      id, date, status, stars_awarded_today, coach_notes,
      class:classes!attendance_class_id_fkey (id, name)
    `)
    .eq('student_id', id)
    .order('date', { ascending: false })
    .limit(30)

  const profile = mapToProfile(stu, ledger, enrolments, attendance)

  return (
    <DashboardShell
      user={user}
      currentPath="/students"
      pageTitle={`${profile.firstName}${profile.lastName ? ` ${profile.lastName}` : ''}`}
      pageSubtitle={profile.age !== null ? `${profile.age} years old · Tier ${profile.starTier} · ${profile.totalStars} stars` : 'Student profile'}
      pageActions={
        <a
          href="/students"
          className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
        >
          ← All students
        </a>
      }
    >
      <StudentProfileView profile={profile} />
    </DashboardShell>
  )
}

function mapToProfile(
  stu: any,
  ledger: any[] | null,
  enrolments: any[] | null,
  attendance: any[] | null
): StudentProfile {
  const fam = Array.isArray(stu.family) ? stu.family[0] : stu.family
  return {
    id: stu.id,
    firstName: stu.first_name,
    lastName: stu.last_name,
    age: yearsOld(stu.date_of_birth),
    dob: stu.date_of_birth,
    medical: stu.medical_notes,
    photoConsent: stu.photo_consent,
    photoConsentDate: stu.photo_consent_date,
    blueCardNumber: stu.blue_card_number,
    blueCardExpiry: stu.blue_card_expiry,
    totalStars: stu.total_stars,
    starTier: stu.star_tier,
    traineeStatus: stu.trainee_status,
    family: fam
      ? {
          id: fam.id,
          name: fam.family_name,
          parent: fam.primary_parent,
          email: fam.email,
          phone: fam.phone,
          lifecycle: fam.lifecycle_stage,
        }
      : null,
    ledger: (ledger ?? []).map((l) => {
      const coach = Array.isArray(l.coach) ? l.coach[0] : l.coach
      return {
        id: l.id,
        stars: l.stars,
        reason: l.reason,
        notes: l.notes,
        awardedAt: l.awarded_at,
        coachName: coach?.full_name ?? null,
      }
    }),
    enrolments: (enrolments ?? []).map((e) => {
      const cls = Array.isArray(e.class) ? e.class[0] : e.class
      return {
        id: e.id,
        startDate: e.start_date,
        endDate: e.end_date,
        status: e.status,
        weeklyFee: e.weekly_fee,
        term: e.term,
        className: cls?.name ?? 'Unknown class',
        classId: cls?.id ?? null,
        discipline: cls?.discipline ?? null,
      }
    }),
    attendance: (attendance ?? []).map((a) => {
      const cls = Array.isArray(a.class) ? a.class[0] : a.class
      return {
        id: a.id,
        date: a.date,
        status: a.status,
        stars: a.stars_awarded_today ?? 0,
        notes: a.coach_notes,
        className: cls?.name ?? 'Unknown',
      }
    }),
  }
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
