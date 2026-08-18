import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { AttendanceTable, type RosterRow } from './attendance-table'
import { LessonPlansClient } from '@/components/lesson-plans-client'
import { markAttendance, removeFromClass, searchStudents, addToClass, createAndEnrol, moveToClass, saveCoachNote, awardStar, setFamilyPayment } from './actions'
import { TERM_DATES, type Term, currentTerm, getTerm, termWeekDates, termsForYear, brisbaneToday } from '@/lib/term-dates'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h, 10)
  const period = hour >= 12 ? 'pm' : 'am'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}:${m}${period}`
}

export default async function RollCallClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>
  searchParams: Promise<{ term?: string; year?: string }>
}) {
  const { classId } = await params
  const sp = await searchParams
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const todayIso = brisbaneToday()

  // Pick the term — query string ?term=2&year=2026 wins, else default to today's term
  const fallback = currentTerm(todayIso)
  const requestedTerm = sp.term ? (parseInt(sp.term, 10) as Term) : fallback.term
  const requestedYear = sp.year ? parseInt(sp.year, 10) : fallback.year
  const termRange = getTerm(requestedYear, requestedTerm) ?? fallback

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

  // 2. Week dates for the selected term, anchored to this class's day-of-week
  const weekDates = termWeekDates(termRange, cls.day_of_week)

  // 3. Enrolled students (active enrolments only) + family context
  const { data: enrolments } = await supabase
    .from('enrolments')
    .select(`
      id, notes, start_date,
      student:students!enrolments_student_id_fkey (
        id, first_name, last_name, date_of_birth, medical_notes, total_stars, star_tier,
        family:families!students_family_id_fkey (
          id, family_name, primary_parent, email, phone, lifecycle_stage, weekly_fee_total, stripe_customer_id, tags
        )
      )
    `)
    .eq('class_id', classId)
    .eq('status', 'active')
    .returns<Array<{
      id: string
      notes: string | null
      start_date: string
      student: {
        id: string
        first_name: string
        last_name: string | null
        date_of_birth: string | null
        medical_notes: string | null
        total_stars: number
        star_tier: number
        family: { id: string; family_name: string; primary_parent: string | null; email: string | null; phone: string | null; lifecycle_stage: string | null; weekly_fee_total: number | null; stripe_customer_id: string | null; tags: string[] | null } | null
      }
    }>>()

  // 4. Attendance across ALL the weeks in the selected term
  const { data: attendance } = await supabase
    .from('attendance')
    .select('id, student_id, date, status, stars_awarded_today, coach_notes')
    .eq('class_id', classId)
    .in('date', weekDates)

  // Index attendance by studentId+date for quick lookup
  const attByKey = new Map<string, { id: string; status: string }>()
  const noteByStudentToday = new Map<string, string>()
  for (const a of attendance ?? []) {
    attByKey.set(`${a.student_id}::${a.date}`, { id: a.id, status: a.status })
    if (a.date === todayIso && a.coach_notes) noteByStudentToday.set(a.student_id, a.coach_notes)
  }

  // Payment truth for this roster (admin view only):
  //  - subscriptions table = the live Stripe sync → who genuinely pays by DD
  //  - play_on_vouchers   = active vouchers, matched by family or student name
  // Coaches never see any of this — their roster is stripped below.
  const isAdmin = user.role !== 'coach'
  const famIds = Array.from(new Set((enrolments ?? []).map((e) => {
    const f = Array.isArray(e.student.family) ? e.student.family[0] : e.student.family
    return f?.id
  }).filter(Boolean))) as string[]

  const activeSubFamilies = new Set<string>()
  const voucherFamilies = new Set<string>()
  const voucherStudentNames = new Set<string>()
  if (isAdmin && famIds.length > 0) {
    const [{ data: subs }, { data: vouchers }] = await Promise.all([
      supabase.from('subscriptions').select('family_id, status').in('family_id', famIds).eq('status', 'active'),
      supabase.from('play_on_vouchers').select('family_id, student_name, status').eq('status', 'active'),
    ])
    for (const s of subs ?? []) if (s.family_id) activeSubFamilies.add(s.family_id)
    for (const v of vouchers ?? []) {
      if (v.family_id) voucherFamilies.add(v.family_id)
      if (v.student_name) voucherStudentNames.add(v.student_name.trim().toLowerCase())
    }
  }

  const roster: RosterRow[] = (enrolments ?? []).map((e, idx) => {
    const fam = Array.isArray(e.student.family) ? e.student.family[0] : e.student.family
    const commitment = (e.notes ?? '').replace(/^Commitment:\s*/, '').trim()
    const commitLower = commitment.toLowerCase()
    const studentFullName = `${e.student.first_name} ${e.student.last_name ?? ''}`.trim().toLowerCase()

    // An admin-recorded method always wins: stored as a pay:<method> family tag.
    const explicitPay = (fam?.tags ?? []).find((t: string) => t.startsWith('pay:'))?.slice(4) ?? null

    // Evidence, strongest first: recorded method → live Stripe sub → active
    // voucher → roll-sheet text → Stripe/lifecycle presence. The old version
    // checked Stripe FIRST, which hid every voucher family behind "DD".
    const hasActiveSub = fam ? activeSubFamilies.has(fam.id) : false
    const hasVoucher = (fam ? voucherFamilies.has(fam.id) : false) || voucherStudentNames.has(studentFullName)

    let paymentStatus: RosterRow['paymentStatus'] = 'unknown'
    let payStyle: RosterRow['payStyle'] = '—'
    if (explicitPay) {
      const map: Record<string, [RosterRow['paymentStatus'], RosterRow['payStyle']]> = {
        subscription: ['subscribed', 'DD'], voucher: ['play_on', 'Voucher'], ndis: ['ndis', 'NDIS'],
        eftpos: ['casual', 'EFTPOS'], cash: ['casual', 'Cash'], bank: ['subscribed', 'Bank'],
        trial: ['free_trial', 'Trial'], none: ['not_paying', '—'],
      }
      ;[paymentStatus, payStyle] = map[explicitPay] ?? ['unknown', '—']
    } else if (hasActiveSub) {
      paymentStatus = 'subscribed'; payStyle = 'DD'
    } else if (hasVoucher || /play\s*on|playon|\bpo\b/i.test(commitLower)) {
      paymentStatus = 'play_on'; payStyle = 'Voucher'
    } else if (/\bndis\b/i.test(commitLower)) {
      paymentStatus = 'ndis'; payStyle = 'NDIS'
    } else if (/\bcasual\b/i.test(commitLower)) {
      paymentStatus = 'casual'; payStyle = 'Cash'
    } else if (/^(ft|free trial)$/i.test(commitLower)) {
      paymentStatus = 'free_trial'; payStyle = 'Trial'
    } else if (/\bsub(scription)?\b/i.test(commitLower) || fam?.stripe_customer_id || fam?.lifecycle_stage === 'active' || (fam?.weekly_fee_total ?? 0) > 0) {
      paymentStatus = 'subscribed'; payStyle = 'DD'
    } else if (fam?.lifecycle_stage === 'past' || fam?.lifecycle_stage === 'lost') {
      paymentStatus = 'not_paying'
    }

    // Build the week-by-week attendance map for this row
    const weeks: RosterRow['weeks'] = weekDates.map((date) => {
      const att = attByKey.get(`${e.student.id}::${date}`)
      return { date, status: (att?.status as RosterRow['weeks'][number]['status']) ?? null, attendanceId: att?.id ?? null }
    })

    const totalAttended = weeks.filter((w) => w.status === 'present' || w.status === 'late' || w.status === 'makeup').length

    return {
      rowNumber: idx + 1,
      enrolmentId: e.id,
      studentId: e.student.id,
      firstName: e.student.first_name,
      lastName: e.student.last_name,
      dob: e.student.date_of_birth,
      age: yearsOld(e.student.date_of_birth),
      birthdayInTerm: birthdayInTerm(e.student.date_of_birth, termRange.start, termRange.end, todayIso),
      medical: e.student.medical_notes,
      starTier: e.student.star_tier,
      totalStars: e.student.total_stars,
      familyId: fam?.id ?? null,
      familyName: fam?.family_name ?? null,
      primaryParent: fam?.primary_parent ?? null,
      parentEmail: fam?.email ?? null,
      parentPhone: fam?.phone ?? null,
      // Coaches see NO payment information at all — not hidden by CSS, simply
      // never sent to the browser. Admin gets the full picture.
      weeklyFee: isAdmin ? (fam?.weekly_fee_total ?? 0) : 0,
      paymentStatus: isAdmin ? paymentStatus : 'unknown',
      payStyle: isAdmin ? payStyle : '—',
      explicitPay: isAdmin ? explicitPay : null,
      startDate: e.start_date,
      weeks,
      totalAttended,
      todayNote: noteByStudentToday.get(e.student.id) ?? null,
    }
  }).sort((a, b) => a.firstName.localeCompare(b.firstName))

  // All other active classes — for the "move selected kids to another roll" dropdown
  const { data: allClasses } = await supabase
    .from('classes')
    .select('id, name, day_of_week, start_time')
    .order('day_of_week')
    .order('start_time')
  const classOptions = (allClasses ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    dayLabel: DAY_NAMES[c.day_of_week]?.slice(0, 3) ?? '',
  }))

  const allYears = Array.from(new Set(TERM_DATES.map((t) => t.year))).sort()
  const termsThisYear = termsForYear(termRange.year)

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
      {/* Term + year picker — BSC red/yellow brand */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-amber-200 p-3 mb-5 flex items-center gap-3 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">Year</span>
        <div className="flex gap-1">
          {allYears.map((y) => (
            <a
              key={y}
              href={`/roll-call/${classId}?year=${y}&term=${termRange.term}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${
                y === termRange.year
                  ? 'bg-gradient-to-br from-[#D72027] to-[#A0151B] text-white shadow'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              {y}
            </a>
          ))}
        </div>
        <span className="text-zinc-300 mx-1">·</span>
        <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">Term</span>
        <div className="flex gap-1">
          {termsThisYear.map((t) => (
            <a
              key={t.term}
              href={`/roll-call/${classId}?year=${t.year}&term=${t.term}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${
                t.term === termRange.term
                  ? 'bg-gradient-to-br from-[#FFC107] to-amber-500 text-zinc-900 shadow'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              T{t.term}
            </a>
          ))}
        </div>
        <span className="ml-auto text-xs text-zinc-500">
          {weekDates.length > 0 && (
            <>W1 = <strong>{shortDate(weekDates[0]!)}</strong> · {weekDates.length} weeks</>
          )}
        </span>
      </div>

      <AttendanceTable
        classId={classId}
        roster={roster}
        weekDates={weekDates}
        termLabel={`Term ${termRange.term} ${termRange.year}`}
        todayDate={todayIso}
        onMark={markAttendance}
        onRemove={removeFromClass}
        onSearch={searchStudents}
        onAdd={addToClass}
        onCreate={createAndEnrol}
        onMove={moveToClass}
        onSaveNote={saveCoachNote}
        onAward={awardStar}
        className={cls.name}
        classes={classOptions}
        isAdmin={isAdmin}
        onSetPayment={setFamilyPayment}
      />

      {/* Lesson plans & progress — right here under the roll (great for private lessons) */}
      {roster.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-zinc-500 mb-3">📝 Lesson plans &amp; progress</h2>
          <LessonPlansClient
            students={roster.map((r) => ({ id: r.studentId, name: `${r.firstName} ${r.lastName ?? ''}`.trim() }))}
            initialStudentId={roster.length === 1 ? roster[0]!.studentId : undefined}
          />
        </div>
      )}
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

function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00+10:00')
  return `${d.getDate()}.${d.getMonth() + 1}`
}

// Does this child's birthday fall inside the displayed term? If so, label it
// and flag if it's within the next ~2 weeks so coaches can plan to celebrate.
function birthdayInTerm(dob: string | null, termStart: string, termEnd: string, todayIso: string): { label: string; soon: boolean } | null {
  if (!dob) return null
  const parts = dob.split('-')
  if (parts.length < 3) return null
  const [, mm, dd] = parts
  if (!mm || !dd) return null
  const year = parseInt(termStart.slice(0, 4), 10)
  const bday = `${year}-${mm}-${dd}` // birthday in the term's year
  if (bday < termStart || bday > termEnd) return null
  const ms = (s: string) => new Date(s + 'T00:00:00+10:00').getTime()
  const days = Math.round((ms(bday) - ms(todayIso)) / 86_400_000)
  const label = new Date(bday + 'T00:00:00+10:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  return { label, soon: days >= -1 && days <= 14 }
}
