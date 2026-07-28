import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

async function guard() {
  const user = await verifySession()
  if (!['owner', 'manager'].includes(user.role)) return null
  return user
}
const FIELDS = 'id, candidate_name, role_type, interview_date, start_time, interviewer, items, decision, notes, status, created_by, created_at, updated_at'

export async function GET(req: Request) {
  const user = await guard(); if (!user) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const admin = createAdminSupabase()
  const id = new URL(req.url).searchParams.get('id')
  if (id) {
    const { data } = await admin.from('interviews').select(FIELDS).eq('id', id).eq('tenant_id', user.tenantId).maybeSingle()
    return NextResponse.json({ ok: true, row: data })
  }
  const { data } = await admin.from('interviews').select(FIELDS).eq('tenant_id', user.tenantId).order('interview_date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
  return NextResponse.json({ ok: true, rows: data ?? [] })
}

export async function POST(req: Request) {
  const user = await guard(); if (!user) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  if (!b.candidate_name?.trim()) return NextResponse.json({ error: 'Candidate name is required' }, { status: 400 })
  const admin = createAdminSupabase()
  const row = {
    tenant_id: user.tenantId,
    candidate_name: b.candidate_name.trim(),
    role_type: b.role_type || null,
    interview_date: b.interview_date || null,
    start_time: b.start_time || null,
    interviewer: b.interviewer || user.fullName || null,
    items: Array.isArray(b.items) ? b.items : [],
    decision: b.decision || null,
    notes: b.notes || null,
    status: b.status === 'completed' ? 'completed' : 'draft',
    created_by: user.email || user.fullName || null,
  }
  const { data, error } = await admin.from('interviews').insert(row).select(FIELDS).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, row: data })
}

export async function PATCH(req: Request) {
  const user = await guard(); if (!user) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of ['candidate_name', 'role_type', 'interview_date', 'start_time', 'interviewer', 'items', 'decision', 'notes', 'status']) {
    if (k in b) patch[k] = b[k]
  }
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('interviews').update(patch).eq('id', b.id).eq('tenant_id', user.tenantId).select(FIELDS).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, row: data })
}

export async function DELETE(req: Request) {
  const user = await guard(); if (!user) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { error } = await admin.from('interviews').delete().eq('id', id).eq('tenant_id', user.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
