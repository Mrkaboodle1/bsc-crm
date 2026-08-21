import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// Admin corrections to the coach time clock (/timesheets page).
// POST { action: 'update', id, clockIn, clockOut } — ISO strings, clockOut may be null
//      { action: 'delete', id }
//      { action: 'add', coachId, clockIn, clockOut }
// Owner/manager only — coaches can never edit hours.

export async function POST(req: Request) {
  const user = await verifySession()
  if (!['owner', 'manager'].includes(user.role)) {
    return NextResponse.json({ ok: false, error: 'Admin only' }, { status: 403 })
  }
  const admin = await createServerSupabaseAdmin()
  const b = await req.json().catch(() => ({}))

  try {
    if (b.action === 'update') {
      const { error } = await admin.from('coach_time_logs')
        .update({ clock_in: String(b.clockIn), clock_out: b.clockOut ? String(b.clockOut) : null, source: 'admin-adjusted' })
        .eq('id', String(b.id)).eq('tenant_id', user.tenantId)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }
    if (b.action === 'delete') {
      const { error } = await admin.from('coach_time_logs').delete()
        .eq('id', String(b.id)).eq('tenant_id', user.tenantId)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }
    if (b.action === 'add') {
      const { data: coach } = await admin.from('coaches').select('id, full_name, role')
        .eq('id', String(b.coachId)).eq('tenant_id', user.tenantId).maybeSingle()
      if (!coach) return NextResponse.json({ ok: false, error: 'Coach not found' }, { status: 400 })
      const trainee = coach.role === 'trainee'
      const { error } = await admin.from('coach_time_logs').insert({
        tenant_id: user.tenantId, coach_id: coach.id, user_id: null,
        person_name: trainee ? `${coach.full_name} (trainee)` : coach.full_name,
        kind: trainee ? 'trainee' : 'coach', source: 'admin',
        clock_in: String(b.clockIn), clock_out: b.clockOut ? String(b.clockOut) : null,
      })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 140) }, { status: 500 })
  }
}
