// GET /api/starband/students — list all students with their NFC + status
// (used by the register/list pages on the kiosk side).

import { NextResponse } from 'next/server'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const sb = await createServerSupabaseAdmin()
    const { data, error } = await sb
      .from('students')
      .select('id, first_name, last_name, nfc_uid, stars_total, xp_total, attendance_streak')
      .order('first_name', { ascending: true })
      .limit(500)
    if (error) throw error

    // Mark who's currently checked in.
    const { data: open } = await sb
      .from('starband_sessions')
      .select('student_id, checked_in_at')
      .is('checked_out_at', null)
    const openMap = new Map((open || []).map((s) => [s.student_id, s.checked_in_at]))

    const students = (data || []).map((s) => ({
      ...s,
      checked_in: openMap.has(s.id),
      checked_in_at: openMap.get(s.id) ?? null,
    }))
    return NextResponse.json({ ok: true, students })
  } catch (err) {
    console.error('starband students error', err)
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
