// /api/incidents — Incident & Accident reports. Coaches (on the day) + admin.
// GET (list, newest first) · POST (create) · PATCH (edit). Media/eufy stored as JSON.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

// Coaches log incidents too, so allow coach + support alongside owner/manager.
async function guard() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: 'Not signed in', status: 401 as const }
  const { data: p } = await supabase.from('users').select('tenant_id, role, name, email').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id) return { error: 'No tenant', status: 403 as const }
  if (!['owner', 'manager', 'coach', 'support'].includes(p.role)) return { error: 'Not allowed', status: 403 as const }
  return { tenantId: p.tenant_id as string, role: p.role as string, who: (p.name || p.email || 'Staff') as string }
}

const FIELDS = 'id, report_no, workshop_id, occurred_on, occurred_at, location, report_type, severity, children, reporter_name, description, action_taken, injury_details, witnesses, parent_notified, parent_notified_details, media, eufy_evidence, status, created_by, created_at, updated_at'

export async function GET(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const admin = createAdminSupabase()
  const wid = new URL(req.url).searchParams.get('workshop_id')
  let q = admin.from('incident_reports').select(FIELDS).eq('tenant_id', g.tenantId).order('occurred_on', { ascending: false }).order('created_at', { ascending: false })
  if (wid) q = q.eq('workshop_id', wid)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, rows: data ?? [] })
}

// INC-YYYYMMDD-NN, numbered per day.
async function nextReportNo(admin: ReturnType<typeof createAdminSupabase>, tenantId: string, occurredOn: string) {
  const key = 'INC-' + occurredOn.replace(/-/g, '')
  const { data } = await admin.from('incident_reports').select('report_no').eq('tenant_id', tenantId).like('report_no', `${key}%`)
  const n = (data ?? []).length + 1
  return `${key}-${String(n).padStart(2, '0')}`
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  const occurred_on = (b.occurred_on || new Date().toISOString().slice(0, 10)) as string
  const admin = createAdminSupabase()
  const row = {
    tenant_id: g.tenantId,
    report_no: await nextReportNo(admin, g.tenantId, occurred_on),
    workshop_id: b.workshop_id || null,
    occurred_on,
    occurred_at: b.occurred_at || null,
    location: b.location || null,
    report_type: ['incident', 'accident', 'injury', 'near_miss'].includes(b.report_type) ? b.report_type : 'incident',
    severity: b.severity || null,
    children: b.children || null,
    reporter_name: b.reporter_name || g.who,
    description: b.description || null,
    action_taken: b.action_taken || null,
    injury_details: b.injury_details || null,
    witnesses: b.witnesses || null,
    parent_notified: !!b.parent_notified,
    parent_notified_details: b.parent_notified_details || null,
    media: Array.isArray(b.media) ? b.media : [],
    eufy_evidence: Array.isArray(b.eufy_evidence) ? b.eufy_evidence : [],
    status: 'open',
    created_by: g.who,
  }
  const { data, error } = await admin.from('incident_reports').insert(row).select(FIELDS).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, row: data })
}

export async function PATCH(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of ['workshop_id', 'occurred_on', 'occurred_at', 'location', 'report_type', 'severity', 'children', 'reporter_name', 'description', 'action_taken', 'injury_details', 'witnesses', 'parent_notified', 'parent_notified_details', 'media', 'eufy_evidence', 'status']) {
    if (k in b) patch[k] = b[k]
  }
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('incident_reports').update(patch).eq('id', b.id).eq('tenant_id', g.tenantId).select(FIELDS).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, row: data })
}
