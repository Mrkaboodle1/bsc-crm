// POST /api/starband/checkin
// Body: { nfc_uid: string }
// Looks up the student by NFC, opens a session, awards +5 stars, returns a
// kiosk-friendly payload. If a session is already open (band re-tapped on
// arrival), it's idempotent — returns the existing session.

import { NextResponse } from 'next/server'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'
import { autoMarkRoll, notifyParentOnCheck, brisbaneNow } from '@/lib/starband-notify'

export const runtime = 'nodejs'

const STARS_PER_CHECKIN = 5

export async function POST(req: Request) {
  let body: { nfc_uid?: string } = {}
  try { body = await req.json() } catch { /* ignore */ }
  const nfc_uid = (body.nfc_uid ?? '').toString().trim().toUpperCase()
  if (!nfc_uid) return NextResponse.json({ ok: false, error: 'missing nfc_uid' }, { status: 400 })

  try {
    const sb = await createServerSupabaseAdmin()

    // Multi-tag lookup (Layer 1 + 2): wristband OR sticker OR card.
    const { data: tag } = await sb
      .from('nfc_tags')
      .select('student_id')
      .eq('nfc_uid', nfc_uid)
      .eq('is_active', true)
      .maybeSingle()

    const studentFilter = tag
      ? sb.from('students').select('id, tenant_id, family_id, first_name, last_name, stars_total, xp_total, attendance_streak').eq('id', tag.student_id)
      : sb.from('students').select('id, tenant_id, family_id, first_name, last_name, stars_total, xp_total, attendance_streak').eq('nfc_uid', nfc_uid)

    const { data: student, error } = await studentFilter.maybeSingle()
    if (error) throw error
    if (!student) return NextResponse.json({ ok: false, error: 'no_student', message: 'StarBand not registered yet — tap to register.' }, { status: 404 })

    // Already checked in? Return the existing open session (idempotent).
    const { data: existing } = await sb
      .from('starband_sessions')
      .select('id, checked_in_at, stars_awarded')
      .eq('student_id', student.id)
      .is('checked_out_at', null)
      .order('checked_in_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({
        ok: true,
        action: 'already_in',
        student: { name: `${student.first_name} ${student.last_name}`, stars: student.stars_total, xp: student.xp_total, streak: student.attendance_streak },
        session_id: existing.id,
        message: `${student.first_name} is already checked in.`,
      })
    }

    // Open new session.
    const { data: session, error: insErr } = await sb
      .from('starband_sessions')
      .insert({ tenant_id: student.tenant_id, student_id: student.id, nfc_uid, stars_awarded: STARS_PER_CHECKIN })
      .select('id, checked_in_at')
      .single()
    if (insErr) throw insErr

    // Award stars + bump streak.
    const newStars = (student.stars_total || 0) + STARS_PER_CHECKIN
    const newStreak = (student.attendance_streak || 0) + 1
    await sb.from('students').update({ stars_total: newStars, attendance_streak: newStreak }).eq('id', student.id)

    // Safety layer: auto-mark the Roll Call, then text the parent (gated).
    const ctx = brisbaneNow()
    const roll = await autoMarkRoll(sb, student, ctx)
    const notify = await notifyParentOnCheck(sb, {
      student,
      action: 'in',
      autoMarkedClass: roll.className,
      pretty: ctx.pretty,
    })

    return NextResponse.json({
      ok: true,
      action: 'checked_in',
      student: { name: `${student.first_name} ${student.last_name}`, stars: newStars, xp: student.xp_total, streak: newStreak },
      session_id: session.id,
      stars_awarded: STARS_PER_CHECKIN,
      roll_marked: roll.marked,
      roll_class: roll.className,
      parent_notified: notify.sent,
      message: `Welcome ${student.first_name}!`,
    })
  } catch (err) {
    console.error('starband checkin error', err)
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
