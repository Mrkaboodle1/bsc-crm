// POST /api/starband/checkout
// Body: { nfc_uid: string }
// Closes the open StarBand session for this student, awards +10 XP and an
// extra +5 stars, returns the goodbye payload. If no open session exists
// the kiosk is told politely.

import { NextResponse } from 'next/server'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const STARS_PER_CHECKOUT = 5
const XP_PER_CHECKOUT = 10

export async function POST(req: Request) {
  let body: { nfc_uid?: string; collected_by?: string } = {}
  try { body = await req.json() } catch { /* ignore */ }
  const nfc_uid = (body.nfc_uid ?? '').toString().trim().toUpperCase()
  const collected_by = (body.collected_by ?? '').toString().trim() || null
  if (!nfc_uid) return NextResponse.json({ ok: false, error: 'missing nfc_uid' }, { status: 400 })

  try {
    const sb = await createServerSupabaseAdmin()

    // Multi-tag lookup (wristband / sticker / card all resolve to same student).
    const { data: tag } = await sb.from('nfc_tags').select('student_id').eq('nfc_uid', nfc_uid).eq('is_active', true).maybeSingle()
    const studentFilter = tag
      ? sb.from('students').select('id, tenant_id, first_name, last_name, stars_total, xp_total, attendance_streak').eq('id', tag.student_id)
      : sb.from('students').select('id, tenant_id, first_name, last_name, stars_total, xp_total, attendance_streak').eq('nfc_uid', nfc_uid)
    const { data: student } = await studentFilter.maybeSingle()
    if (!student) return NextResponse.json({ ok: false, error: 'no_student', message: 'StarBand not registered yet.' }, { status: 404 })

    const { data: open } = await sb
      .from('starband_sessions')
      .select('id, checked_in_at, stars_awarded, xp_awarded')
      .eq('student_id', student.id)
      .is('checked_out_at', null)
      .order('checked_in_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!open) {
      return NextResponse.json({
        ok: true,
        action: 'no_open_session',
        student: { name: `${student.first_name} ${student.last_name}`, stars: student.stars_total, xp: student.xp_total, streak: student.attendance_streak },
        message: `${student.first_name} hasn't been checked in yet.`,
      })
    }

    await sb
      .from('starband_sessions')
      .update({
        checked_out_at: new Date().toISOString(),
        stars_awarded: (open.stars_awarded || 0) + STARS_PER_CHECKOUT,
        xp_awarded: (open.xp_awarded || 0) + XP_PER_CHECKOUT,
        collected_by,
      })
      .eq('id', open.id)

    const newStars = (student.stars_total || 0) + STARS_PER_CHECKOUT
    const newXP = (student.xp_total || 0) + XP_PER_CHECKOUT
    await sb.from('students').update({ stars_total: newStars, xp_total: newXP }).eq('id', student.id)

    return NextResponse.json({
      ok: true,
      action: 'checked_out',
      student: { name: `${student.first_name} ${student.last_name}`, stars: newStars, xp: newXP, streak: student.attendance_streak },
      stars_awarded: STARS_PER_CHECKOUT,
      xp_awarded: XP_PER_CHECKOUT,
      message: `Goodbye ${student.first_name}! See you next time.`,
    })
  } catch (err) {
    console.error('starband checkout error', err)
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
