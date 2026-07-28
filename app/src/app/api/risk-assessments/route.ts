// /api/risk-assessments — editable, printable risk assessments. Owner/manager.
// GET (list) · POST (create) · PATCH (edit) · DELETE (?id)
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

export async function GET() {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('risk_assessments').select('id, title, activity_type, content, updated_at').eq('tenant_id', g.tenantId).order('title')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, rows: data })
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  const admin = createAdminSupabase()
  // Bulk seed: { seed: [ {title, activity_type, content}, ... ] }
  if (Array.isArray(b.seed)) {
    const rows = b.seed.map((s: Record<string, unknown>) => ({ tenant_id: g.tenantId, title: String(s.title || 'Risk assessment'), activity_type: s.activity_type || null, content: s.content || {} }))
    const { data, error } = await admin.from('risk_assessments').insert(rows).select('id, title, activity_type, content, updated_at')
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, rows: data })
  }
  if (!b.title?.trim()) return NextResponse.json({ error: 'Give it a title' }, { status: 400 })
  const { data, error } = await admin.from('risk_assessments').insert({ tenant_id: g.tenantId, title: b.title.trim(), activity_type: b.activity_type || null, content: b.content || {} }).select('id, title, activity_type, content, updated_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, row: data })
}

export async function PATCH(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if ('title' in b) patch.title = String(b.title || '').trim() || 'Risk assessment'
  if ('content' in b) patch.content = b.content
  const admin = createAdminSupabase()
  const { error } = await admin.from('risk_assessments').update(patch).eq('id', b.id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { error } = await admin.from('risk_assessments').delete().eq('id', id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
