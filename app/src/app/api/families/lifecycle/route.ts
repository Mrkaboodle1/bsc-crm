// POST /api/families/lifecycle — move a family to a new pipeline stage.
// Body: { id, stage }. Owner/manager/coach.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { fireAutomationEvent, type AutomationEvent } from '@/lib/automation'

export const runtime = 'nodejs'
const STAGES = ['lead', 'trial', 'active', 'paused', 'past', 'lost']
// Which pipeline move fires which Hive automation.
const STAGE_EVENT: Record<string, AutomationEvent> = {
  trial: 'trial.booked', active: 'member.joined', paused: 'family.paused', lost: 'family.lost',
}

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  if (!['owner', 'manager', 'coach'].includes(p.role)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  if (!b.id || !STAGES.includes(b.stage)) return NextResponse.json({ error: 'Missing id or invalid stage' }, { status: 400 })
  const admin = createAdminSupabase()
  const { data: updated, error } = await admin.from('families')
    .update({ lifecycle_stage: b.stage }).eq('id', b.id).eq('tenant_id', p.tenant_id)
    .select('id, family_name, primary_parent, email, phone').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Feed the central Hive when a family moves to a stage that has an automation.
  const evt = STAGE_EVENT[b.stage]
  if (evt && updated) {
    const { data: t } = await admin.from('tenants').select('name').eq('id', p.tenant_id).maybeSingle()
    await fireAutomationEvent(p.tenant_id, evt, {
      familyId: updated.id, name: updated.primary_parent || updated.family_name,
      email: updated.email, phone: updated.phone, stage: b.stage,
    }, t?.name)
  }
  return NextResponse.json({ ok: true })
}
