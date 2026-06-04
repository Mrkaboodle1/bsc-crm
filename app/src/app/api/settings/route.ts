import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

// POST /api/settings — update the business profile (owners only).
const FIELDS = ['name', 'abn', 'email', 'phone', 'website', 'address', 'founded_year', 'primary_colour', 'accent_colour', 'logo_url'] as const

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  if (profile.role !== 'owner') return NextResponse.json({ error: 'Only the owner can change settings' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}
  for (const f of FIELDS) if (f in body) patch[f] = body[f] === '' ? null : body[f]
  if (body.founded_year != null && body.founded_year !== '') patch.founded_year = parseInt(String(body.founded_year), 10) || null

  const admin = createAdminSupabase()
  const { error } = await admin.from('tenants').update(patch).eq('id', profile.tenant_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
