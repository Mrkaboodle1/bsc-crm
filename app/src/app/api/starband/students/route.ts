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
      .select('id, first_name, last_name, nfc_uid, photo_url, pin_code, stars_total, xp_total, attendance_streak')
      .order('first_name', { ascending: true })
      .limit(500)
    if (error) throw error

    // Mark who's currently checked in.
    const { data: open } = await sb
      .from('starband_sessions')
      .select('student_id, checked_in_at')
      .is('checked_out_at', null)
    const openMap = new Map((open || []).map((s) => [s.student_id, s.checked_in_at]))

    // Count active tags per student so the dashboard can show "2 bands".
    const { data: tags } = await sb
      .from('nfc_tags')
      .select('student_id, kind')
      .eq('is_active', true)
    const tagCount = new Map<string, number>()
    for (const t of tags || []) tagCount.set(t.student_id, (tagCount.get(t.student_id) || 0) + 1)

    const students = (data || []).map((s) => ({
      ...s,
      checked_in: openMap.has(s.id),
      checked_in_at: openMap.get(s.id) ?? null,
      tag_count: tagCount.get(s.id) || (s.nfc_uid ? 1 : 0),
    }))
    return NextResponse.json({ ok: true, students })
  } catch (err) {
    console.error('starband students error', err)
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
