// GET /api/starband/dashboard — today's StarBand stats for the reception view.

import { NextResponse } from 'next/server'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const sb = await createServerSupabaseAdmin()
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
    const isoStart = startOfDay.toISOString()

    const { data: today } = await sb
      .from('starband_sessions')
      .select('id, student_id, nfc_uid, checked_in_at, checked_out_at, stars_awarded, xp_awarded, students(first_name, last_name)')
      .gte('checked_in_at', isoStart)
      .order('checked_in_at', { ascending: false })

    const checked_in = (today || []).filter((s) => !s.checked_out_at)
    const checked_out = (today || []).filter((s) => !!s.checked_out_at)
    const stars_today = (today || []).reduce((acc, s) => acc + (s.stars_awarded || 0), 0)

    return NextResponse.json({
      ok: true,
      today_count: (today || []).length,
      checked_in_count: checked_in.length,
      checked_out_count: checked_out.length,
      stars_today,
      sessions: today || [],
    })
  } catch (err) {
    console.error('starband dashboard error', err)
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
