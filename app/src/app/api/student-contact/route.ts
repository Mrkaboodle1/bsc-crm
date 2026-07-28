// /api/student-contact — view & edit a student's PARENT contact (email/phone).
// Coach-accessible so coaches can fix mum/dad's details from the roll/lesson page.
// GET (?student_id) · PATCH { student_id, email?, phone? }
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
  if (!['owner', 'manager', 'coach', 'support'].includes(p.role)) return { error: 'Not allowed', status: 403 as const }
  return { tenantId: p.tenant_id as string }
}

async function familyOf(admin: ReturnType<typeof createAdminSupabase>, tenantId: string, studentId: string) {
  const { data: s } = await admin.from('students').select('family_id').eq('id', studentId).eq('tenant_id', tenantId).maybeSingle()
  return s?.family_id ?? null
}

export async function GET(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const sid = new URL(req.url).searchParams.get('student_id')
  if (!sid) return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
  const admin = createAdminSupabase()
  const famId = await familyOf(admin, g.tenantId, sid)
  if (!famId) return NextResponse.json({ ok: true, family: null })
  const { data: fam } = await admin.from('families').select('id, primary_parent, email, phone, emergency_phone').eq('id', famId).maybeSingle()
  return NextResponse.json({ ok: true, family: fam })
}

export async function PATCH(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.student_id) return NextResponse.json({ error: 'Missing student' }, { status: 400 })
  const admin = createAdminSupabase()
  const famId = await familyOf(admin, g.tenantId, b.student_id)
  if (!famId) return NextResponse.json({ error: 'This child has no family record yet.' }, { status: 400 })
  const t = (v: unknown) => { const s = String(v ?? '').trim(); return s || null }
  const patch: Record<string, unknown> = {}
  if ('email' in b) patch.email = t(b.email)
  if ('phone' in b) patch.phone = t(b.phone)
  if ('emergency_phone' in b) patch.emergency_phone = t(b.emergency_phone)
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  const { error } = await admin.from('families').update(patch).eq('id', famId).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
