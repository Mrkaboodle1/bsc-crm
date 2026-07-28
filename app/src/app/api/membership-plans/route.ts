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
  if (!['owner', 'manager'].includes(profile.role)) return { error: 'Not allowed', status: 403 as const }
  return { tenantId: profile.tenant_id as string }
}

const FIELDS = ['name', 'description', 'price', 'billing_period', 'perks', 'class_credits', 'active', 'sort'] as const

function clean(body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {}
  for (const f of FIELDS) if (f in body) patch[f] = body[f] === '' ? null : body[f]
  if ('price' in patch) patch.price = Number(patch.price) || 0
  if ('perks' in patch && typeof body.perks === 'string') patch.perks = String(body.perks).split('\n').map((s) => s.trim()).filter(Boolean)
  return patch
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const body = await req.json().catch(() => ({}))
  if (!body.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('membership_plans').insert({ tenant_id: g.tenantId, ...clean(body) }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { error } = await admin.from('membership_plans').update(clean(body)).eq('id', body.id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { error } = await admin.from('membership_plans').update({ active: false }).eq('id', id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
