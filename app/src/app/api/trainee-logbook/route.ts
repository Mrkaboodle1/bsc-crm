// /api/trainee-logbook — add or remove a trainee logbook hours entry (owner/manager/coach).
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

async function guard() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: 'Not signed in', status: 401 as const }
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id) return { error: 'No tenant', status: 403 as const }
  if (!['owner', 'manager', 'coach'].includes(p.role)) return { error: 'Not allowed', status: 403 as const }
  return { tenantId: p.tenant_id as string }
}

function hoursBetween(tin?: string, tout?: string): number {
  if (!tin || !tout) return 0
  const [h1, m1] = tin.split(':').map(Number); const [h2, m2] = tout.split(':').map(Number)
  const mins = (h2 * 60 + m2) - (h1 * 60 + m1)
  return mins > 0 ? Math.round((mins / 60) * 100) / 100 : 0
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.coach_id || !b.entry_date) return NextResponse.json({ error: 'Missing trainee or date' }, { status: 400 })
  const admin = createAdminSupabase()
  const hours = b.hours != null && b.hours !== '' ? Number(b.hours) : hoursBetween(b.time_in, b.time_out)
  const { error } = await admin.from('trainee_logbook').insert({
    tenant_id: g.tenantId, coach_id: b.coach_id, entry_date: b.entry_date,
    time_in: b.time_in || null, time_out: b.time_out || null, hours,
    activity: b.activity || null, signed_off: !!b.signed_off,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { error } = await admin.from('trainee_logbook').delete().eq('id', id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
