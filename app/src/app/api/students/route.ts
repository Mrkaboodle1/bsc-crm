// /api/students — add / edit / remove a child on a family. Owner/manager.
// POST {family_id, first_name, last_name?, date_of_birth?}
// PATCH {id, first_name?, last_name?, date_of_birth?}
// DELETE ?id=
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
const clean = (v: unknown) => { const s = String(v ?? '').trim(); return s || null }

export async function POST(req: Request) {
  const c = await ctx(); if ('error' in c) return NextResponse.json({ error: c.error }, { status: c.status })
  const b = await req.json().catch(() => ({}))
  if (!b.family_id || !String(b.first_name ?? '').trim()) return NextResponse.json({ error: 'Need a family and a first name' }, { status: 400 })
  // verify the family belongs to this tenant
  const { data: fam } = await c.admin.from('families').select('id, tenant_id').eq('id', b.family_id).eq('tenant_id', c.tenantId).maybeSingle()
  if (!fam) return NextResponse.json({ error: 'Family not found' }, { status: 404 })
  const { data, error } = await c.admin.from('students').insert({
    tenant_id: c.tenantId, family_id: b.family_id,
    first_name: String(b.first_name).trim(), last_name: clean(b.last_name), date_of_birth: clean(b.date_of_birth),
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(req: Request) {
  const c = await ctx(); if ('error' in c) return NextResponse.json({ error: c.error }, { status: c.status })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const patch: Record<string, unknown> = {}
  if ('first_name' in b) { const v = String(b.first_name ?? '').trim(); if (!v) return NextResponse.json({ error: 'First name cannot be empty' }, { status: 400 }); patch.first_name = v }
  if ('last_name' in b) patch.last_name = clean(b.last_name)
  if ('date_of_birth' in b) patch.date_of_birth = clean(b.date_of_birth)
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  const { error } = await c.admin.from('students').update(patch).eq('id', b.id).eq('tenant_id', c.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const c = await ctx(); if ('error' in c) return NextResponse.json({ error: c.error }, { status: c.status })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await c.admin.from('students').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
