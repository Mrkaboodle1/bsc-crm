// /api/campaigns — CRUD for the Marketing → Campaigns editor.
// GET (list) · POST (create) · PATCH (edit / schedule / post) · DELETE.
// Owner/manager only. Tenant-scoped via the signed-in user.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

async function ctx() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: 'Not signed in', status: 401 as const }
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id) return { error: 'No tenant', status: 403 as const }
  if (!['owner', 'manager'].includes(p.role)) return { error: 'Not allowed', status: 403 as const }
  return { tenantId: p.tenant_id as string, admin: createAdminSupabase() }
}

const FIELDS = ['channel', 'title', 'month', 'subject', 'content', 'image_url', 'status', 'scheduled_for', 'sort'] as const
function pick(b: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const k of FIELDS) if (k in b) out[k] = b[k]
  return out
}

export async function GET() {
  const c = await ctx(); if ('error' in c) return NextResponse.json({ error: c.error }, { status: c.status })
  const { data, error } = await c.admin.from('campaigns').select('*').eq('tenant_id', c.tenantId).order('month', { ascending: true }).order('sort', { ascending: true })
  if (error) return NextResponse.json({ error: error.message, campaigns: [] }, { status: 200 })
  return NextResponse.json({ campaigns: data ?? [] })
}

export async function POST(req: Request) {
  const c = await ctx(); if ('error' in c) return NextResponse.json({ error: c.error }, { status: c.status })
  const b = await req.json().catch(() => ({}))
  if (!b.title || !b.channel) return NextResponse.json({ error: 'Missing title or channel' }, { status: 400 })
  const { data, error } = await c.admin.from('campaigns').insert({ ...pick(b), tenant_id: c.tenantId }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ campaign: data })
}

export async function PATCH(req: Request) {
  const c = await ctx(); if ('error' in c) return NextResponse.json({ error: c.error }, { status: c.status })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { data, error } = await c.admin.from('campaigns').update(pick(b)).eq('id', b.id).eq('tenant_id', c.tenantId).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ campaign: data })
}

export async function DELETE(req: Request) {
  const c = await ctx(); if ('error' in c) return NextResponse.json({ error: c.error }, { status: c.status })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await c.admin.from('campaigns').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
