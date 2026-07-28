// /api/lesson-plans — private-lesson plans per student. Coach-accessible.
// GET (?student_id) · POST · PATCH · DELETE (?id)
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

const FIELDS = ['date', 'title', 'did', 'progress', 'next_focus'] as const
function clean(b: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const f of FIELDS) if (f in b) out[f] = b[f] === '' ? null : b[f]
  return out
}

export async function GET(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const sid = new URL(req.url).searchParams.get('student_id')
  if (!sid) return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('lesson_plans')
    .select('id, student_id, date, title, did, progress, next_focus')
    .eq('student_id', sid).eq('tenant_id', g.tenantId).order('date', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, rows: data })
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.student_id || !b.date) return NextResponse.json({ error: 'Pick a student and a date' }, { status: 400 })
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('lesson_plans').insert({ tenant_id: g.tenantId, student_id: b.student_id, ...clean(b) }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const patch = { ...clean(b), updated_at: new Date().toISOString() }
  const admin = createAdminSupabase()
  const { error } = await admin.from('lesson_plans').update(patch).eq('id', b.id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { error } = await admin.from('lesson_plans').delete().eq('id', id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
