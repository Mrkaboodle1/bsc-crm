import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

// POST /api/starband/settings — save per-business StarBand settings into
// tenants.settings->'starband'. Owner/manager only. Tenant-driven (franchise-ready).
export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  if (!['owner', 'manager'].includes(profile.role)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const admin = createAdminSupabase()
  const { data: tenant } = await admin.from('tenants').select('settings').eq('id', profile.tenant_id).maybeSingle()
  const settings = (tenant?.settings ?? {}) as Record<string, unknown>
  const starband = (settings.starband ?? {}) as Record<string, unknown>

  // Whitelisted, typed settings.
  if ('auto_text' in b) starband.auto_text = !!b.auto_text
  if ('mode' in b && ['tap', 'faces', 'pin'].includes(b.mode)) starband.default_mode = b.mode
  if ('checkout_late_after' in b) starband.checkout_late_after = String(b.checkout_late_after || '18:00')
  if ('enabled_modes' in b && Array.isArray(b.enabled_modes)) starband.enabled_modes = b.enabled_modes.filter((m: string) => ['tap', 'faces', 'pin'].includes(m))

  const next = { ...settings, starband }
  const { error } = await admin.from('tenants').update({ settings: next }).eq('id', profile.tenant_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, starband })
}
