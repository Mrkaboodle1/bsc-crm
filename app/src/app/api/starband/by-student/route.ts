// POST /api/starband/by-student   Body: { student_id: string }
// Face-tap path: reception picks a kid from the photo grid → same toggle.

import { NextResponse } from 'next/server'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const STARS_IN = 5
const STARS_OUT = 5
const XP_OUT = 10

export async function POST(req: Request) {
  let body: { student_id?: string } = {}
  try { body = await req.json() } catch { /* ignore */ }
  const student_id = (body.student_id ?? '').toString().trim()
  if (!student_id) return NextResponse.json({ ok: false, error: 'missing student_id' }, { status: 400 })

  try {
    const sb = await createServerSupabaseAdmin()
    const { data: student } = await sb.from('students')
      .select('id, tenant_id, first_name, last_name, stars_total, xp_total, attendance_streak')
      .eq('id', student_id).maybeSingle()
    if (!student) return NextResponse.json({ ok: false, error: 'no_student' }, { status: 404 })

    const { data: open } = await sb.from('starband_sessions')
      .select('id, stars_awarded, xp_awarded').eq('student_id', student.id).is('checked_out_at', null)
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
      tenant_id: student.tenant_id, student_id: student.id, nfc_uid: 'FACE:' + student_id.slice(0, 8), stars_awarded: STARS_IN,
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
    console.error('starband by-student', err)
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
