import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

// POST /api/settings — update the business profile (owners only).
const FIELDS = ['name', 'abn', 'email', 'phone', 'website', 'address', 'founded_year', 'primary_colour', 'accent_colour', 'logo_url', 'email_signature'] as const

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

  // Extended profile fields (tagline, mission, socials) live in tenants.settings.profile.
  if (body.profile && typeof body.profile === 'object') {
    const { data: t } = await admin.from('tenants').select('settings').eq('id', profile.tenant_id).maybeSingle()
    const settings = (t?.settings ?? {}) as Record<string, unknown>
    const current = (settings.profile ?? {}) as Record<string, unknown>
    const incoming = body.profile as { tagline?: string; mission?: string; headerLocation?: string; ownerName?: string; socials?: Record<string, string> }
    const next: Record<string, unknown> = { ...current }
    if ('tagline' in incoming) next.tagline = incoming.tagline || null
    if ('mission' in incoming) next.mission = incoming.mission || null
    if ('headerLocation' in incoming) next.headerLocation = incoming.headerLocation || null
    if ('ownerName' in incoming) next.ownerName = incoming.ownerName || null
    if (incoming.socials && typeof incoming.socials === 'object') {
      const cur = (current.socials ?? {}) as Record<string, string>
      next.socials = { ...cur, ...incoming.socials }
    }
    patch.settings = { ...settings, profile: next }
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true })
  const { error } = await admin.from('tenants').update(patch).eq('id', profile.tenant_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
