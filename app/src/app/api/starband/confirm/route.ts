// GET /api/starband/confirm — coach "confirm the roll" view.
// Today's StarBand check-ins with photo + the class the roll was auto-marked
// against, so a coach can eyeball the room against the screen on their iPad.

import { NextResponse } from 'next/server'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'
import { brisbaneNow } from '@/lib/starband-notify'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const sb = await createServerSupabaseAdmin()
    const { date } = brisbaneNow()
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
    const isoStart = startOfDay.toISOString()

    const baseStu = 'first_name, last_name, photo_url, allergies, medical_notes'
    const cols = (extra: string) => `id, student_id, nfc_uid, checked_in_at, checked_out_at, students(${baseStu}${extra})`
    let sessions: unknown[] | null = null
    const first = await sb.from('starband_sessions').select(cols(', support_needs, support_strategy')).gte('checked_in_at', isoStart).order('checked_in_at', { ascending: false })
    if (first.error && first.error.message.includes('support_')) {
      const fb = await sb.from('starband_sessions').select(cols('')).gte('checked_in_at', isoStart).order('checked_in_at', { ascending: false })
      sessions = fb.data
    } else {
      sessions = first.data
    }

    // Today's auto/marked attendance → map student → class name + status.
    const { data: rolls } = await sb
      .from('attendance')
      .select('student_id, status, classes(name)')
      .eq('date', date)

    const rollMap = new Map<string, { className: string | null; status: string }>()
    type RollRow = { student_id: string; status: string; classes: { name: string } | null }
    for (const r of (rolls as RollRow[] | null) ?? []) {
      rollMap.set(r.student_id, { className: r.classes?.name ?? null, status: r.status })
    }

    type SRow = {
      id: string; student_id: string; nfc_uid: string
      checked_in_at: string; checked_out_at: string | null
      students: { first_name: string; last_name: string; photo_url: string | null; allergies: string | null; medical_notes: string | null; support_needs?: string | null; support_strategy?: string | null } | null
    }
    const list = ((sessions as SRow[] | null) ?? []).map((s) => {
      const roll = rollMap.get(s.student_id)
      const flags = [s.students?.allergies, s.students?.medical_notes].filter(Boolean) as string[]
      return {
        id: s.id,
        student_id: s.student_id,
        name: s.students ? `${s.students.first_name} ${s.students.last_name}` : s.nfc_uid,
        first_name: s.students?.first_name ?? '',
        photo_url: s.students?.photo_url ?? null,
        checked_in_at: s.checked_in_at,
        checked_out_at: s.checked_out_at,
        present: !s.checked_out_at,
        class_name: roll?.className ?? null,
        roll_status: roll?.status ?? null,
        flags,
        support_needs: s.students?.support_needs ?? null,
        support_strategy: s.students?.support_strategy ?? null,
      }
    })

    const inNow = list.filter((s) => s.present)
    return NextResponse.json({
      ok: true,
      date,
      total: list.length,
      in_now: inNow.length,
      flagged: list.filter((s) => s.flags.length > 0).length,
      sessions: list,
    })
  } catch (err) {
    console.error('starband confirm error', err)
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
