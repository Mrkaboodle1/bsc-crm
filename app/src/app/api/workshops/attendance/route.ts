// /api/workshops/attendance — coach actions on a child's workshop attendance.
// PATCH { id, action?: 'signin'|'signout'|'present'|'absent'|'reset', ...fields }
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
  // coaches + trainees (support) can mark attendance, not just managers
  if (!['owner', 'manager', 'coach', 'support'].includes(p.role)) return { error: 'Not allowed', status: 403 as const }
  return { tenantId: p.tenant_id as string }
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.workshop_id || !String(b.child_name || '').trim()) return NextResponse.json({ error: 'Need a workshop and a child name' }, { status: 400 })
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('workshop_attendance').insert({
    tenant_id: g.tenantId,
    workshop_id: b.workshop_id,
    child_name: String(b.child_name).trim(),
    parent_name: b.parent_name ? String(b.parent_name).trim() : null,
    parent_contact: b.parent_contact ? String(b.parent_contact).trim() : null,
    medical: b.medical ? String(b.medical).trim() : null,
    status: 'expected',
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function DELETE(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { error } = await admin.from('workshop_attendance').delete().eq('id', id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = {}

  switch (b.action) {
    case 'signin': patch.signed_in_at = now; patch.status = 'present'; break
    case 'signout': patch.signed_out_at = now; if (b.signed_out_to != null) patch.signed_out_to = String(b.signed_out_to).trim() || null; break
    case 'present': patch.status = 'present'; break
    case 'absent': patch.status = 'absent'; break
    case 'reset': patch.status = 'expected'; patch.signed_in_at = null; patch.signed_out_at = null; patch.signed_out_to = null; break
  }
  // free-text edits
  for (const f of ['child_name', 'medical', 'incident', 'notes', 'signed_out_to', 'parent_contact'] as const) {
    if (f in b && b.action == null) patch[f] = b[f] === '' ? null : b[f]
  }
  if ('child_name' in b && b.child_name) patch.child_name = String(b.child_name).trim()
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const admin = createAdminSupabase()
  const { error } = await admin.from('workshop_attendance').update(patch).eq('id', b.id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
