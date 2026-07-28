// /api/sequence-steps — the editable free-trial funnel. Owner/manager.
// GET (list; seeds from built-in copy on first open) · PATCH (edit subject/body/timing).
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { seedFreeTrialSteps } from '@/lib/sequence'

export const runtime = 'nodejs'

async function guard() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: 'Not signed in', status: 401 as const }
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id || !['owner', 'manager'].includes(p.role)) return { error: 'Not allowed', status: 403 as const }
  return { tenantId: p.tenant_id as string }
}

export async function GET() {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const admin = createAdminSupabase()
  await seedFreeTrialSteps(admin, g.tenantId).catch(() => 0)
  const { data, error } = await admin.from('sequence_steps').select('id, step_order, tag, offset_days, subject, body_html, active').eq('tenant_id', g.tenantId).eq('sequence', 'free_trial').order('step_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, steps: data ?? [] })
}

export async function PATCH(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if ('subject' in b) patch.subject = String(b.subject || '')
  if ('body_html' in b) patch.body_html = String(b.body_html || '')
  if ('offset_days' in b) patch.offset_days = Math.max(0, parseInt(b.offset_days, 10) || 0)
  if ('active' in b) patch.active = !!b.active
  const admin = createAdminSupabase()
  const { error } = await admin.from('sequence_steps').update(patch).eq('id', b.id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
