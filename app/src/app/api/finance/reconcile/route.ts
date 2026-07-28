// /api/finance/reconcile — remembers which reconcile lines the owner has
// ticked off, and any note against them. Owner/manager only.
//
// Stored inside tenants.settings.reconcile (JSON) so no new database table is
// needed: { [lineKey]: { checked: boolean, note: string } }.
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

type CheckState = { checked: boolean; note: string }

export async function GET() {
  const g = await guard()
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const admin = createAdminSupabase()
  const { data } = await admin.from('tenants').select('settings').eq('id', g.tenantId).maybeSingle()
  const settings = (data?.settings ?? {}) as Record<string, unknown>
  return NextResponse.json({ ok: true, checks: (settings.reconcile ?? {}) as Record<string, CheckState> })
}

export async function POST(req: Request) {
  const g = await guard()
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = (await req.json().catch(() => ({}))) as { key?: string; checked?: boolean; note?: string }
  const key = String(b.key ?? '').trim()
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 })

  const admin = createAdminSupabase()
  const { data } = await admin.from('tenants').select('settings').eq('id', g.tenantId).maybeSingle()
  const settings = (data?.settings ?? {}) as Record<string, unknown>
  const reconcile = (settings.reconcile ?? {}) as Record<string, CheckState>
  const cur = reconcile[key] ?? { checked: false, note: '' }
  reconcile[key] = {
    checked: 'checked' in b ? !!b.checked : cur.checked,
    note: 'note' in b ? String(b.note ?? '').slice(0, 500) : cur.note,
  }
  settings.reconcile = reconcile

  const { error } = await admin.from('tenants').update({ settings }).eq('id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, check: reconcile[key] })
}
