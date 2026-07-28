// /api/waivers — read + edit the booking waiver wording (owner/manager).
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { DEFAULT_WAIVER } from '@/lib/waivers'

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
  const { data: t } = await admin.from('tenants').select('settings').eq('id', g.tenantId).maybeSingle()
  const w = (t?.settings as Record<string, unknown> | null)?.waiver || {}
  return NextResponse.json({ waiver: { ...DEFAULT_WAIVER, ...w } })
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  const waiver = {
    liability: String(b.liability ?? DEFAULT_WAIVER.liability).slice(0, 4000),
    media: String(b.media ?? DEFAULT_WAIVER.media).slice(0, 2000),
    medical: String(b.medical ?? DEFAULT_WAIVER.medical).slice(0, 2000),
  }
  const admin = createAdminSupabase()
  const { data: t } = await admin.from('tenants').select('settings').eq('id', g.tenantId).maybeSingle()
  const settings = (t?.settings ?? {}) as Record<string, unknown>
  const { error } = await admin.from('tenants').update({ settings: { ...settings, waiver } }).eq('id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, waiver })
}
