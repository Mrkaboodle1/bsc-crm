'use server'

// Server actions for the Roll Call screen.
// Both honour RLS — the supabase client carries the signed-in user's session.

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { createServerSupabase, createServerSupabaseAdmin } from '@/lib/supabase-server'
import { detectForStudent } from '@/lib/loyalty'
import type { Status } from './attendance-grid'

type MarkResult =
  | { ok: true; attendanceId: string | null; milestonesReached?: number[] }
  | { ok: false; error: string }

export async function markAttendance(input: {
  classId: string
  date: string
  studentId: string
  enrolmentId: string
  status: Status | null
}): Promise<MarkResult> {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  // Try to find a matching coach for this user (so marked_by_coach_id is set).
  let coachId: string | null = null
  const { data: coachMatch } = await supabase
    .from('coaches')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (coachMatch?.id) coachId = coachMatch.id

  // If status is null we treat it as "clear" → delete the attendance row.
  if (input.status === null) {
    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('class_id', input.classId)
      .eq('student_id', input.studentId)
      .eq('date', input.date)
    if (error) return { ok: false, error: error.message }
    revalidatePath(`/roll-call/${input.classId}`)
    return { ok: true, attendanceId: null }
  }

  // Upsert by (student_id, class_id, date) — schema has a UNIQUE constraint there.
  const { data, error } = await supabase
    .from('attendance')
    .upsert(
      {
        tenant_id: user.tenantId,
        student_id: input.studentId,
        class_id: input.classId,
        enrolment_id: input.enrolmentId,
        date: input.date,
        status: input.status,
        marked_by_coach_id: coachId,
        marked_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,class_id,date' }
    )
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }

  // Loyalty milestones: if this counts as attending, check for a newly-reached
  // milestone so the coach sees it instantly. Best-effort — never block the roll.
  let milestonesReached: number[] = []
  if (input.status === 'present' || input.status === 'late' || input.status === 'makeup') {
    try { milestonesReached = await detectForStudent(supabase, user.tenantId, input.studentId) } catch { /* ignore */ }
  }

  revalidatePath(`/roll-call/${input.classId}`)
  return { ok: true, attendanceId: data.id, milestonesReached }
}

// Save a coach's note against a student's session on a given date.
// Notes live in attendance.coach_notes. If no attendance row exists for that
// day yet we create one marked 'present' (a coach writing a note is taking the
// roll for a child who's in class) — they can change the status afterwards.
export async function saveCoachNote(input: {
  classId: string
  studentId: string
  enrolmentId: string
  date: string
  note: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const note = input.note.trim() || null

  let coachId: string | null = null
  const { data: coachMatch } = await supabase.from('coaches').select('id').eq('user_id', user.id).maybeSingle()
  if (coachMatch?.id) coachId = coachMatch.id

  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('class_id', input.classId)
    .eq('student_id', input.studentId)
    .eq('date', input.date)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('attendance')
      .update({ coach_notes: note, marked_by_coach_id: coachId, marked_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase.from('attendance').insert({
      tenant_id: user.tenantId,
      student_id: input.studentId,
      class_id: input.classId,
      enrolment_id: input.enrolmentId,
      date: input.date,
      status: 'present',
      coach_notes: note,
      marked_by_coach_id: coachId,
      marked_at: new Date().toISOString(),
    })
    if (error) return { ok: false, error: error.message }
  }
  revalidatePath(`/roll-call/${input.classId}`)
  return { ok: true }
}

type AwardResult =
  | { ok: true; newTotal: number; newTier: number }
  | { ok: false; error: string }

export async function awardStar(input: {
  classId: string
  studentId: string
  stars: number
  reason: string
  notes: string | null
}): Promise<AwardResult> {
  const user = await verifySession()
  // Use the admin client so the ledger insert is never blocked by RLS — coaches
  // award stars too, and the coach role has no direct insert policy on star_ledger.
  const supabase = await createServerSupabaseAdmin()

  if (input.stars < 1 || input.stars > 20) {
    return { ok: false, error: 'Stars must be between 1 and 20' }
  }

  // Find coach for attribution
  let coachId: string | null = null
  const { data: coachMatch } = await supabase
    .from('coaches')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (coachMatch?.id) coachId = coachMatch.id

  // Find today's attendance row to link the star (may be null if not marked yet)
  const today = new Date().toISOString().slice(0, 10)
  const { data: att } = await supabase
    .from('attendance')
    .select('id')
    .eq('class_id', input.classId)
    .eq('student_id', input.studentId)
    .eq('date', today)
    .maybeSingle()

  // Insert star ledger entry — trigger from migration 001 will update student totals
  const { error: ledgerErr } = await supabase.from('star_ledger').insert({
    tenant_id: user.tenantId,
    student_id: input.studentId,
    stars: input.stars,
    reason: input.reason,
    notes: input.notes,
    awarded_by_coach_id: coachId,
    related_attendance_id: att?.id ?? null,
  })
  if (ledgerErr) return { ok: false, error: ledgerErr.message }

  // Bump the attendance row's stars_awarded_today counter if we have one.
  // Best-effort: a failure here doesn't affect the ledger write.
  if (att?.id) {
    const { data: current } = await supabase
      .from('attendance')
      .select('stars_awarded_today')
      .eq('id', att.id)
      .maybeSingle()
    if (current) {
      await supabase
        .from('attendance')
        .update({ stars_awarded_today: (current.stars_awarded_today ?? 0) + input.stars })
        .eq('id', att.id)
    }
  }

  // Re-read student totals (trigger updated them)
  const { data: stu } = await supabase
    .from('students')
    .select('total_stars, star_tier')
    .eq('id', input.studentId)
    .maybeSingle()

  revalidatePath(`/roll-call/${input.classId}`)
  return {
    ok: true,
    newTotal: stu?.total_stars ?? 0,
    newTier: stu?.star_tier ?? 1,
  }
}

// ────────────────────────────────────────────────────────────────────
// Enrolment management — add/remove students from a class
// ────────────────────────────────────────────────────────────────────

type EnrolResult = { ok: true } | { ok: false; error: string }

export async function removeFromClass(input: { enrolmentId: string; classId: string }): Promise<EnrolResult> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  // We "cancel" rather than delete so historical attendance keeps the link.
  const { error } = await supabase
    .from('enrolments')
    .update({ status: 'cancelled', end_date: new Date().toISOString().slice(0, 10) })
    .eq('id', input.enrolmentId)
    .eq('tenant_id', user.tenantId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/roll-call/${input.classId}`)
  return { ok: true }
}

/**
 * Search students by first or last name (substring), excluding those already
 * enrolled in this class.
 */
export async function searchStudents(input: { classId: string; query: string }): Promise<
  { ok: true; results: Array<{ studentId: string; firstName: string; lastName: string | null; familyName: string; primaryParent: string | null }> }
  | { ok: false; error: string }
> {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const q = input.query.trim()
  if (q.length < 2) return { ok: true, results: [] }

  // 1. Find already-enrolled student ids so we can exclude them
  const { data: existing } = await supabase
    .from('enrolments')
    .select('student_id')
    .eq('class_id', input.classId)
    .eq('status', 'active')
  const excludeIds = new Set((existing ?? []).map((e) => e.student_id))

  const { data, error } = await supabase
    .from('students')
    .select('id, first_name, last_name, family:families!students_family_id_fkey(id, family_name, primary_parent)')
    .eq('tenant_id', user.tenantId)
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
    .limit(20)
  if (error) return { ok: false, error: error.message }

  const results = (data ?? [])
    .filter((s) => !excludeIds.has(s.id))
    .map((s) => {
      const fam = Array.isArray(s.family) ? s.family[0] : s.family
      return {
        studentId: s.id,
        firstName: s.first_name,
        lastName: s.last_name,
        familyName: fam?.family_name ?? '?',
        primaryParent: fam?.primary_parent ?? null,
      }
    })
  return { ok: true, results }
}

export async function addToClass(input: { studentId: string; classId: string }): Promise<EnrolResult> {
  const user = await verifySession()
  const supabase = await createServerSupabaseAdmin()
  // Reactivate a cancelled enrolment if it exists, otherwise insert a fresh one.
  const today = new Date().toISOString().slice(0, 10)
  const { data: existing } = await supabase
    .from('enrolments')
    .select('id')
    .eq('tenant_id', user.tenantId)
    .eq('student_id', input.studentId)
    .eq('class_id', input.classId)
    .maybeSingle()
  if (existing) {
    const { error } = await supabase
      .from('enrolments')
      .update({ status: 'active', end_date: null })
      .eq('id', existing.id)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase.from('enrolments').insert({
      tenant_id: user.tenantId,
      student_id: input.studentId,
      class_id: input.classId,
      start_date: today,
      status: 'active',
      term: 'Term 3 2026',
    })
    if (error) return { ok: false, error: error.message }
  }
  revalidatePath(`/roll-call/${input.classId}`)
  return { ok: true }
}

// Create a brand-new child (+ optional parent + tag) and enrol them in one go.
export async function createAndEnrol(input: { firstName: string; lastName?: string; dob?: string; parentName?: string; parentPhone?: string; parentEmail?: string; tag?: string; classId: string }): Promise<EnrolResult> {
  const user = await verifySession()
  const admin = await createServerSupabaseAdmin()
  if (!input.firstName?.trim()) return { ok: false, error: 'Enter the child’s name' }
  const email = (input.parentEmail || '').toLowerCase().trim()
  const phone9 = (input.parentPhone || '').replace(/\D/g, '').slice(-9)
  let familyId: string | null = null
  if (email || phone9) {
    const ors: string[] = []
    if (email) ors.push(`email.ilike.*${email}*`)
    if (phone9) ors.push(`phone.ilike.*${phone9}*`)
    const { data: fam } = await admin.from('families').select('id').eq('tenant_id', user.tenantId).or(ors.join(',')).limit(1)
    if (fam && fam.length) familyId = fam[0].id
  }
  if (!familyId) {
    const surname = (input.parentName || input.lastName || input.firstName).trim().split(' ').slice(-1)[0]
    const { data: nf, error } = await admin.from('families').insert({ tenant_id: user.tenantId, family_name: surname, primary_parent: input.parentName || null, email: email || null, phone: input.parentPhone || null, lifecycle_stage: 'lead', tags: input.tag ? [input.tag] : [] }).select('id').single()
    if (error || !nf) return { ok: false, error: error?.message || 'Could not create family' }
    familyId = nf.id
  }
  const { data: st, error: se } = await admin.from('students').insert({ tenant_id: user.tenantId, family_id: familyId, first_name: input.firstName.trim(), last_name: input.lastName || null, date_of_birth: input.dob || null }).select('id').single()
  if (se || !st) return { ok: false, error: se?.message || 'Could not add child' }
  const { error: ee } = await admin.from('enrolments').insert({ tenant_id: user.tenantId, student_id: st.id, class_id: input.classId, start_date: new Date().toISOString().slice(0, 10), status: 'active', term: 'Term 3 2026', notes: input.tag ? `Commitment: ${input.tag}` : null })
  if (ee) return { ok: false, error: ee.message }
  revalidatePath(`/roll-call/${input.classId}`)
  return { ok: true }
}

// Move selected enrolments to another class (bulk).
export async function moveToClass(input: { enrolmentIds: string[]; toClassId: string; fromClassId: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await verifySession()
  const admin = await createServerSupabaseAdmin()
  if (!input.enrolmentIds?.length || !input.toClassId) return { ok: false, error: 'Nothing to move' }
  const { error } = await admin.from('enrolments').update({ class_id: input.toClassId, status: 'active' }).in('id', input.enrolmentIds).eq('tenant_id', user.tenantId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/roll-call/${input.fromClassId}`)
  revalidatePath(`/roll-call/${input.toClassId}`)
  return { ok: true }
}

// ── Admin-only: record how a family pays ─────────────────────────────────────
// Stored as a `pay:<method>` tag on the family, so no schema change is needed.
// Coaches can never call this — the roll they see carries no payment data at all.

export type PayMethod = 'subscription' | 'voucher' | 'ndis' | 'eftpos' | 'cash' | 'bank' | 'trial' | 'none'

export async function setFamilyPayment(input: {
  classId: string
  familyId: string
  method: PayMethod | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await verifySession()
  if (user.role === 'coach') return { ok: false, error: 'Only admin can change payment records' }

  const admin = await createServerSupabaseAdmin()
  const { data: fam, error: readErr } = await admin
    .from('families')
    .select('tags')
    .eq('id', input.familyId)
    .eq('tenant_id', user.tenantId)
    .maybeSingle()
  if (readErr || !fam) return { ok: false, error: readErr?.message ?? 'Family not found' }

  const tags: string[] = (fam.tags ?? []).filter((t: string) => !t.startsWith('pay:'))
  if (input.method) tags.push(`pay:${input.method}`)

  const { error } = await admin
    .from('families')
    .update({ tags })
    .eq('id', input.familyId)
    .eq('tenant_id', user.tenantId)
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/roll-call/${input.classId}`)
  return { ok: true }
}

// ── Admin-only: block a student on the roll ──────────────────────────────────
// A family gives notice, pays out their two weeks, and admin blocks the
// enrolment. The row stays visible on every roll but goes grey with a ⛔ —
// coaches can see they're finishing up but can no longer mark them.
// Stored as enrolment status 'paused' (allowed by the existing CHECK
// constraint) so no schema change is needed. Unblocking restores 'active'.

export async function setEnrolmentBlocked(input: {
  classId: string
  enrolmentId: string
  blocked: boolean
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await verifySession()
  if (user.role === 'coach') return { ok: false, error: 'Only admin can block or unblock a student' }

  const admin = await createServerSupabaseAdmin()
  const { error } = await admin
    .from('enrolments')
    .update({ status: input.blocked ? 'paused' : 'active', updated_at: new Date().toISOString() })
    .eq('id', input.enrolmentId)
    .eq('tenant_id', user.tenantId)
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/roll-call/${input.classId}`)
  return { ok: true }
}
