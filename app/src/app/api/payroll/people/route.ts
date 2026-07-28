// /api/payroll/people — the team you pay. Owner/manager.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

async function guard() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: 'Not signed in', status: 401 as const }
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id || !['owner', 'manager'].includes(p.role)) return { error: 'Not allowed', status: 403 as const }
  return { tenantId: p.tenant_id as string }
}

const num = (v: unknown) => { const n = Number(v); return isFinite(n) ? Math.round(n * 100) / 100 : 0 }
function clean(b: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  if ('name' in b) out.name = String(b.name || '').trim()
  if ('kind' in b && ['contractor', 'employee', 'owner'].includes(String(b.kind))) out.kind = b.kind
  if ('super_applies' in b) out.super_applies = !!b.super_applies
  if ('super_rate' in b) out.super_rate = num(b.super_rate)
  if ('default_amount' in b) out.default_amount = num(b.default_amount)
  if ('abn' in b) out.abn = b.abn || null
  if ('super_fund' in b) out.super_fund = b.super_fund || null
  if ('active' in b) out.active = !!b.active
  if ('notes' in b) out.notes = b.notes || null
  return out
}

export async function GET() {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('payroll_people').select('*').eq('tenant_id', g.tenantId).order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, rows: data })
}
export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('payroll_people').insert({ tenant_id: g.tenantId, ...clean(b) }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, row: data })
}
export async function PATCH(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { error } = await admin.from('payroll_people').update(clean(b)).eq('id', b.id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
export async function DELETE(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { error } = await admin.from('payroll_people').delete().eq('id', id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
