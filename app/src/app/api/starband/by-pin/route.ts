// POST /api/starband/by-pin   Body: { pin: string }
// Resolves a 4-digit PIN to a student, then fires the same check-in
// (or check-out, if a session is already open) logic as the NFC path.

import { NextResponse } from 'next/server'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const STARS_IN = 5
const STARS_OUT = 5
const XP_OUT = 10

export async function POST(req: Request) {
  let body: { pin?: string } = {}
  try { body = await req.json() } catch { /* ignore */ }
  const pin = (body.pin ?? '').toString().trim()
  if (!/^\d{3,8}$/.test(pin)) return NextResponse.json({ ok: false, error: 'bad_pin', message: 'Enter a 4-digit code.' }, { status: 400 })

  try {
    const sb = await createServerSupabaseAdmin()
    const { data: student } = await sb
      .from('students')
      .select('id, tenant_id, first_name, last_name, stars_total, xp_total, attendance_streak')
      .eq('pin_code', pin).maybeSingle()
    if (!student) return NextResponse.json({ ok: false, error: 'no_match', message: 'PIN not recognised.' }, { status: 404 })

    // Is there an open session? toggle to checkout.
    const { data: open } = await sb.from('starband_sessions')
      .select('id, checked_in_at, stars_awarded, xp_awarded')
      .eq('student_id', student.id).is('checked_out_at', null)
      .order('checked_in_at', { ascending: false }).limit(1).maybeSingle()

    if (open) {
      await sb.from('starband_sessions').update({
        checked_out_at: new Date().toISOString(),
        stars_awarded: (open.stars_awarded || 0) + STARS_OUT,
        xp_awarded: (open.xp_awarded || 0) + XP_OUT,
      }).eq('id', open.id)
      const newStars = (student.stars_total || 0) + STARS_OUT
      const newXP = (student.xp_total || 0) + XP_OUT
      await sb.from('students').update({ stars_total: newStars, xp_total: newXP }).eq('id', student.id)
      return NextResponse.json({
        ok: true, action: 'checked_out',
        student: { name: `${student.first_name} ${student.last_name}`, stars: newStars, xp: newXP, streak: student.attendance_streak },
        stars_awarded: STARS_OUT, xp_awarded: XP_OUT,
        message: `Goodbye ${student.first_name}!`,
      })
    }

    await sb.from('starband_sessions').insert({
      tenant_id: student.tenant_id, student_id: student.id, nfc_uid: 'PIN:' + pin, stars_awarded: STARS_IN,
    })
    const newStars = (student.stars_total || 0) + STARS_IN
    const newStreak = (student.attendance_streak || 0) + 1
    await sb.from('students').update({ stars_total: newStars, attendance_streak: newStreak }).eq('id', student.id)
    return NextResponse.json({
      ok: true, action: 'checked_in',
      student: { name: `${student.first_name} ${student.last_name}`, stars: newStars, xp: student.xp_total, streak: newStreak },
      stars_awarded: STARS_IN, message: `Welcome ${student.first_name}!`,
    })
  } catch (err) {
    console.error('starband by-pin', err)
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
