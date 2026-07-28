// /api/workshops/staff — roster coaches & trainees onto a workshop / KNO day.
// POST assign · PATCH change role/status/move day · DELETE remove.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

const POSITIONS = ['head_coach', 'lead', 'coach', 'jr_coach', 'trainee', 'assistant']

async function guard() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: 'Not signed in', status: 401 as const }
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id) return { error: 'No tenant', status: 403 as const }
  if (!['owner', 'manager'].includes(p.role)) return { error: 'Not allowed', status: 403 as const }
  return { tenantId: p.tenant_id as string }
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.workshop_id || !b.coach_id) return NextResponse.json({ error: 'Missing workshop or coach' }, { status: 400 })
  const admin = createAdminSupabase()
  const row = {
    tenant_id: g.tenantId,
    workshop_id: b.workshop_id,
    coach_id: b.coach_id,
    coach_name: b.coach_name || null,
    role: POSITIONS.includes(b.role) ? b.role : 'coach',
    status: 'assigned',
  }
  const { data, error } = await admin.from('workshop_staff').insert(row).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const patch: Record<string, unknown> = {}
  if ('role' in b && POSITIONS.includes(b.role)) patch.role = b.role
  if ('status' in b && ['assigned', 'confirmed', 'declined', 'tentative'].includes(b.status)) patch.status = b.status
  if ('workshop_id' in b && b.workshop_id) patch.workshop_id = b.workshop_id  // move to another day
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  const admin = createAdminSupabase()
  const { error } = await admin.from('workshop_staff').update(patch).eq('id', b.id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { error } = await admin.from('workshop_staff').delete().eq('id', id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
