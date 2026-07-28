// /api/coaches — manage team members (owner/manager).
// POST create · PATCH update (incl. class assignment) · DELETE (soft → departed)
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

async function guard() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: 'Not signed in', status: 401 as const }
  const { data: profile } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!profile?.tenant_id) return { error: 'No tenant', status: 403 as const }
  if (!['owner', 'manager'].includes(profile.role)) return { error: 'Only owners/managers can manage the team', status: 403 as const }
  return { tenantId: profile.tenant_id as string }
}

const FIELDS = ['full_name', 'email', 'phone', 'role', 'employment_type', 'pay_rate', 'skills', 'blue_card_number', 'blue_card_expiry', 'first_aid_expiry', 'ga_accreditation', 'status', 'abn', 'tfn_held', 'super_paid', 'pay_note', 'trainee_level', 'trainee_goals'] as const

function clean(body: Record<string, unknown>) {
  const p: Record<string, unknown> = {}
  for (const f of FIELDS) if (f in body) p[f] = body[f] === '' ? null : body[f]
  if ('pay_rate' in p) p.pay_rate = p.pay_rate == null ? null : Number(p.pay_rate)
  if ('skills' in p && typeof body.skills === 'string') p.skills = String(body.skills).split(',').map((s) => s.trim()).filter(Boolean)
  return p
}

// Set this coach as primary_coach for the chosen class ids; clear it from any
// class that was theirs but is no longer selected.
async function assignClasses(admin: ReturnType<typeof createAdminSupabase>, tenantId: string, coachId: string, classIds: string[]) {
  await admin.from('classes').update({ primary_coach_id: null }).eq('tenant_id', tenantId).eq('primary_coach_id', coachId)
  if (classIds.length) await admin.from('classes').update({ primary_coach_id: coachId }).eq('tenant_id', tenantId).in('id', classIds)
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const body = await req.json().catch(() => ({}))
  if (!body.full_name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('coaches').insert({ tenant_id: g.tenantId, status: 'active', ...clean(body) }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (Array.isArray(body.class_ids)) await assignClasses(admin, g.tenantId, data.id, body.class_ids)
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const patch = clean(body)
  if (Object.keys(patch).length) {
    const { error } = await admin.from('coaches').update(patch).eq('id', body.id).eq('tenant_id', g.tenantId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (Array.isArray(body.class_ids)) await assignClasses(admin, g.tenantId, body.id, body.class_ids)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  // Soft-delete: mark departed + free up their classes.
  await admin.from('classes').update({ primary_coach_id: null }).eq('tenant_id', g.tenantId).eq('primary_coach_id', id)
  const { error } = await admin.from('coaches').update({ status: 'departed' }).eq('id', id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
