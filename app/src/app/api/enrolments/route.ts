// /api/enrolments — put a child into a class, or take them out.
// POST { student_id, class_id } · DELETE (?id=<enrolmentId>)
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
  if (!['owner', 'manager'].includes(p.role)) return { error: 'Not allowed', status: 403 as const }
  return { tenantId: p.tenant_id as string }
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.student_id || !b.class_id) return NextResponse.json({ error: 'Missing child or class' }, { status: 400 })
  const admin = createAdminSupabase()

  // Make sure the class belongs to this tenant, and grab its fee for the snapshot.
  const { data: cls } = await admin.from('classes').select('id, name, weekly_fee').eq('id', b.class_id).eq('tenant_id', g.tenantId).maybeSingle()
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  // Already enrolled (active)? Don't double up.
  const { data: existing } = await admin.from('enrolments').select('id').eq('student_id', b.student_id).eq('class_id', b.class_id).eq('status', 'active').maybeSingle()
  if (existing) return NextResponse.json({ ok: true, id: existing.id, className: cls.name, already: true })

  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await admin.from('enrolments').insert({
    tenant_id: g.tenantId, student_id: b.student_id, class_id: b.class_id,
    start_date: today, status: 'active', weekly_fee: cls.weekly_fee ?? null,
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id, className: cls.name })
}

export async function DELETE(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { error } = await admin.from('enrolments').delete().eq('id', id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
