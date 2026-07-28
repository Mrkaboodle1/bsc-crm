// /api/workshops/running-order — the per-day, drag-and-drop daily schedule.
// Each holiday workshop day has its own running order (times + activities).
// GET (?workshop_id) · POST (add one row, or {rows:[...]} to load a template)
// PATCH ({id,...} edit one, or {reorder:[{id,sort_order}]}) · DELETE (?id)
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

async function guard() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: 'Not signed in', status: 401 as const }
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id) return { error: 'No tenant', status: 403 as const }
  if (!['owner', 'manager', 'coach', 'support'].includes(p.role)) return { error: 'Not allowed', status: 403 as const }
  return { tenantId: p.tenant_id as string }
}

export async function GET(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const wid = new URL(req.url).searchParams.get('workshop_id')
  if (!wid) return NextResponse.json({ error: 'Missing workshop_id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('workshop_running_order')
    .select('id, time_label, activity, activity_id, sort_order')
    .eq('workshop_id', wid).eq('tenant_id', g.tenantId).order('sort_order').order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, rows: data })
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.workshop_id) return NextResponse.json({ error: 'Missing workshop_id' }, { status: 400 })
  const admin = createAdminSupabase()

  // Bulk insert (e.g. "load the standard template" or apply a saved order).
  // When replace=true, clear the day's existing rows first.
  if (Array.isArray(b.rows)) {
    if (b.replace) await admin.from('workshop_running_order').delete().eq('workshop_id', b.workshop_id).eq('tenant_id', g.tenantId)
    const rows = b.rows.map((r: Record<string, unknown>, i: number) => ({
      tenant_id: g.tenantId, workshop_id: b.workshop_id,
      time_label: String(r.time_label || ''), activity: String(r.activity || ''),
      activity_id: r.activity_id || null, sort_order: typeof r.sort_order === 'number' ? r.sort_order : i * 10,
    }))
    const { data, error } = await admin.from('workshop_running_order').insert(rows)
      .select('id, time_label, activity, activity_id, sort_order')
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, rows: data })
  }

  // Single row
  const { data, error } = await admin.from('workshop_running_order').insert({
    tenant_id: g.tenantId, workshop_id: b.workshop_id,
    time_label: String(b.time_label || ''), activity: String(b.activity || ''),
    activity_id: b.activity_id || null, sort_order: typeof b.sort_order === 'number' ? b.sort_order : 999,
  }).select('id, time_label, activity, activity_id, sort_order').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, row: data })
}

export async function PATCH(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  const admin = createAdminSupabase()

  // Reorder: array of {id, sort_order}
  if (Array.isArray(b.reorder)) {
    await Promise.all(b.reorder.map((r: { id: string; sort_order: number }) =>
      admin.from('workshop_running_order').update({ sort_order: r.sort_order }).eq('id', r.id).eq('tenant_id', g.tenantId)))
    return NextResponse.json({ ok: true })
  }

  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const patch: Record<string, unknown> = {}
  if ('time_label' in b) patch.time_label = String(b.time_label || '')
  if ('activity' in b) patch.activity = String(b.activity || '')
  if ('activity_id' in b) patch.activity_id = b.activity_id || null
  if ('sort_order' in b) patch.sort_order = b.sort_order
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  const { error } = await admin.from('workshop_running_order').update(patch).eq('id', b.id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { error } = await admin.from('workshop_running_order').delete().eq('id', id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
