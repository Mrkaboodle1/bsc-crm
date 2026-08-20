import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// The coach time clock.
// GET  — current state: my open shift + every active trainee's state today.
//        For coach-role users with no open shift today, GET also AUTO-CLOCKS
//        them in (this is what "logging into the app logs your hours" means).
// POST — { action: 'off' } closes my shift.
//        { action: 'trainee-in'|'trainee-out', coachId } operates a trainee tile.
// Gracefully returns ready:false until schema/060_coach_time_logs.sql is pasted.

function brisbaneDayStart(): string {
  const now = new Date()
  const bris = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Brisbane' }))
  bris.setHours(0, 0, 0, 0)
  // convert that Brisbane-midnight wall time back to a real instant (UTC+10, no DST)
  return new Date(bris.getTime() - (10 * 60 - 0) * 60000 + bris.getTimezoneOffset() * 60000).toISOString()
}

export async function GET() {
  const user = await verifySession()
  const admin = await createServerSupabaseAdmin()
  const since = brisbaneDayStart()

  try {
    // my coach record (if I am one)
    const { data: myCoach } = await admin.from('coaches').select('id, full_name').eq('user_id', user.id).maybeSingle()

    let me: { name: string; openLogId: string | null; clockIn: string | null } | null = null
    if (myCoach) {
      const { data: open, error } = await admin.from('coach_time_logs')
        .select('id, clock_in').eq('coach_id', myCoach.id).is('clock_out', null)
        .gte('clock_in', since).order('clock_in', { ascending: false }).limit(1)
      if (error) throw error
      if (open?.length) {
        me = { name: myCoach.full_name, openLogId: open[0]!.id, clockIn: open[0]!.clock_in }
      } else if (user.role === 'coach') {
        // auto clock-in: first portal visit today starts the shift
        const { data: ins } = await admin.from('coach_time_logs').insert({
          tenant_id: user.tenantId, coach_id: myCoach.id, user_id: user.id,
          person_name: myCoach.full_name, kind: 'coach', source: 'auto',
        }).select('id, clock_in').single()
        me = ins ? { name: myCoach.full_name, openLogId: ins.id, clockIn: ins.clock_in } : { name: myCoach.full_name, openLogId: null, clockIn: null }
      } else {
        me = { name: myCoach.full_name, openLogId: null, clockIn: null }
      }
    }

    // trainee tiles — every active trainee coach
    const { data: trainees } = await admin.from('coaches')
      .select('id, full_name').eq('tenant_id', user.tenantId).eq('role', 'trainee').eq('status', 'active')
    const tiles = []
    for (const t of trainees ?? []) {
      const { data: open } = await admin.from('coach_time_logs')
        .select('id, clock_in').eq('coach_id', t.id).is('clock_out', null)
        .gte('clock_in', since).order('clock_in', { ascending: false }).limit(1)
      tiles.push({ coachId: t.id, name: t.full_name, openLogId: open?.[0]?.id ?? null, clockIn: open?.[0]?.clock_in ?? null })
    }

    return NextResponse.json({ ready: true, me, trainees: tiles })
  } catch {
    return NextResponse.json({ ready: false, me: null, trainees: [] })
  }
}

export async function POST(req: Request) {
  const user = await verifySession()
  const admin = await createServerSupabaseAdmin()
  const b = await req.json().catch(() => ({}))
  const since = brisbaneDayStart()

  try {
    if (b.action === 'off') {
      const { data: myCoach } = await admin.from('coaches').select('id').eq('user_id', user.id).maybeSingle()
      if (!myCoach) return NextResponse.json({ ok: false, error: 'No coach record' }, { status: 400 })
      await admin.from('coach_time_logs').update({ clock_out: new Date().toISOString() })
        .eq('coach_id', myCoach.id).is('clock_out', null)
      return NextResponse.json({ ok: true })
    }
    if (b.action === 'trainee-in' || b.action === 'trainee-out') {
      const { data: t } = await admin.from('coaches').select('id, full_name, role')
        .eq('id', String(b.coachId)).eq('tenant_id', user.tenantId).maybeSingle()
      if (!t || t.role !== 'trainee') return NextResponse.json({ ok: false, error: 'Trainee not found' }, { status: 400 })
      if (b.action === 'trainee-in') {
        const { data: open } = await admin.from('coach_time_logs')
          .select('id').eq('coach_id', t.id).is('clock_out', null).gte('clock_in', since).limit(1)
        if (!open?.length) {
          await admin.from('coach_time_logs').insert({
            tenant_id: user.tenantId, coach_id: t.id, user_id: null,
            person_name: `${t.full_name} (trainee)`, kind: 'trainee', source: 'portal',
          })
        }
      } else {
        await admin.from('coach_time_logs').update({ clock_out: new Date().toISOString() })
          .eq('coach_id', t.id).is('clock_out', null)
      }
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 120) }, { status: 500 })
  }
}
