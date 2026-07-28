// /api/workshops/bookings — admin add / edit / delete a workshop booking.
// This is how Rhett logs each Stripe booking into the CRM day-by-day tracker.
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
  if (!['owner', 'manager'].includes(p.role)) return { error: 'Not allowed', status: 403 as const }
  return { tenantId: p.tenant_id as string }
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.workshop_id) return NextResponse.json({ error: 'Missing workshop' }, { status: 400 })
  if (!b.parent_name) return NextResponse.json({ error: 'Parent name is required' }, { status: 400 })
  const admin = createAdminSupabase()
  const childCount = Math.max(1, Number(b.child_count) || 1)
  const row = {
    tenant_id: g.tenantId,
    workshop_id: b.workshop_id,
    parent_name: String(b.parent_name).trim(),
    email: b.email || null,
    phone: b.phone || null,
    child_names: b.child_names || null,
    child_count: childCount,
    is_member: !!b.is_member,
    amount_paid: b.amount_paid != null ? Number(b.amount_paid) : null,
    paid: b.paid !== false,
    status: ['booked', 'waitlist', 'cancelled'].includes(b.status) ? b.status : 'booked',
    source: 'admin',
    notes: b.notes || null,
  }
  const { data, error } = await admin.from('workshop_bookings').insert(row).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const patch: Record<string, unknown> = {}
  for (const f of ['parent_name', 'child_names', 'email', 'phone', 'notes', 'status'] as const) if (f in b) patch[f] = b[f] || null
  if ('child_count' in b) patch.child_count = Math.max(1, Number(b.child_count) || 1)
  if ('is_member' in b) patch.is_member = !!b.is_member
  if ('amount_paid' in b) patch.amount_paid = b.amount_paid != null ? Number(b.amount_paid) : null
  if ('paid' in b) patch.paid = !!b.paid
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  const { error } = await admin.from('workshop_bookings').update(patch).eq('id', b.id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { error } = await admin.from('workshop_bookings').delete().eq('id', id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
