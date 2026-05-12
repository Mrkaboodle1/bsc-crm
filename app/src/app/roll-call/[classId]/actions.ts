'use server'

// Server actions for the Roll Call screen.
// Both honour RLS — the supabase client carries the signed-in user's session.

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import type { Status } from './attendance-grid'

type MarkResult =
  | { ok: true; attendanceId: string | null }
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
  revalidatePath(`/roll-call/${input.classId}`)
  return { ok: true, attendanceId: data.id }
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
  const supabase = await createServerSupabase()

  if (input.stars < 1 || input.stars > 5) {
    return { ok: false, error: 'Stars must be between 1 and 5' }
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
