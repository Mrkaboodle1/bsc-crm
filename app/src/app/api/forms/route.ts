import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

// /api/forms — CRUD for form definitions. Owners + managers.
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'form'

async function guard() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) }
  const { data: profile } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!profile?.tenant_id) return { error: NextResponse.json({ error: 'No tenant' }, { status: 403 }) }
  if (!['owner', 'manager'].includes(profile.role)) return { error: NextResponse.json({ error: 'Not allowed' }, { status: 403 }) }
  return { tenantId: profile.tenant_id as string, admin: createAdminSupabase() }
}

async function uniqueSlug(admin: ReturnType<typeof createAdminSupabase>, tenantId: string, base: string, ignoreId?: string) {
  let slug = base; let n = 1
  for (;;) {
    const { data } = await admin.from('forms').select('id').eq('tenant_id', tenantId).eq('slug', slug).maybeSingle()
    if (!data || data.id === ignoreId) return slug
    slug = `${base}-${++n}`
  }
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return g.error
  const b = await req.json().catch(() => ({}))
  const name = String(b.name ?? 'New form').trim() || 'New form'
  const slug = await uniqueSlug(g.admin, g.tenantId, slugify(b.slug || name))
  const fields = Array.isArray(b.fields) && b.fields.length ? b.fields : DEFAULT_FIELDS
  const { data, error } = await g.admin.from('forms')
    .insert({ tenant_id: g.tenantId, name, slug, intro: b.intro ?? null, fields })
    .select('id, slug').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id, slug: data.slug })
}

export async function PATCH(req: Request) {
  const g = await guard(); if ('error' in g) return g.error
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const patch: Record<string, unknown> = {}
  if ('name' in b) patch.name = String(b.name).trim() || 'Untitled form'
  if ('intro' in b) patch.intro = b.intro || null
  if ('fields' in b) patch.fields = Array.isArray(b.fields) ? b.fields : []
  if ('status' in b) patch.status = b.status
  if ('slug' in b && b.slug) patch.slug = await uniqueSlug(g.admin, g.tenantId, slugify(b.slug), b.id)
  const { error } = await g.admin.from('forms').update(patch).eq('id', b.id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const g = await guard(); if ('error' in g) return g.error
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await g.admin.from('forms').delete().eq('id', id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export const DEFAULT_FIELDS = [
  { id: 'f1', type: 'short_text', label: 'Your name', required: true },
  { id: 'f2', type: 'email', label: 'Email', required: false },
  { id: 'f3', type: 'phone', label: 'Phone', required: false },
  { id: 'f4', type: 'long_text', label: 'Message', required: false },
]
