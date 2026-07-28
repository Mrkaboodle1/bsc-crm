// /api/workshops/order-templates — named, reusable daily running orders
// (e.g. "Rodrigo's running order"). GET (list) · POST (save) · DELETE (?id)
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

type Item = { time_label: string; activity: string }

export async function GET() {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('workshop_order_templates')
    .select('id, name, items').eq('tenant_id', g.tenantId).order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, templates: data })
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  const name = String(b.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Give the running order a name' }, { status: 400 })
  const items: Item[] = Array.isArray(b.items)
    ? b.items.map((r: Record<string, unknown>) => ({ time_label: String(r.time_label || ''), activity: String(r.activity || '') }))
    : []
  if (!items.length) return NextResponse.json({ error: 'Nothing to save — add some items first' }, { status: 400 })
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('workshop_order_templates')
    .insert({ tenant_id: g.tenantId, name, items }).select('id, name, items').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, template: data })
}

export async function DELETE(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { error } = await admin.from('workshop_order_templates').delete().eq('id', id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
