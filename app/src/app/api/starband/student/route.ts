import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

// /api/starband/student — manage a child's StarBand details (owner/manager).
// PATCH  { id, pin_code?, photo_url?, allergies?, medical_notes?, authorised_pickup? }
// POST   { action:'assign_band', studentId, nfc_uid, kind?, label? }
//        { action:'deactivate_band', tagId }
async function guard() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) }
  const { data: profile } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!profile?.tenant_id) return { error: NextResponse.json({ error: 'No tenant' }, { status: 403 }) }
  if (!['owner', 'manager'].includes(profile.role)) return { error: NextResponse.json({ error: 'Not allowed' }, { status: 403 }) }
  return { tenantId: profile.tenant_id as string, admin: createAdminSupabase() }
}

const t = (v: unknown) => { const s = String(v ?? '').trim(); return s || null }

export async function PATCH(req: Request) {
  const g = await guard(); if ('error' in g) return g.error
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const patch: Record<string, unknown> = {}
  for (const f of ['pin_code', 'photo_url', 'allergies', 'medical_notes', 'authorised_pickup'] as const) {
    if (f in b) patch[f] = t(b[f])
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  const { error } = await g.admin.from('students').update(patch).eq('id', b.id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return g.error
  const b = await req.json().catch(() => ({}))

  if (b.action === 'assign_band') {
    const uid = String(b.nfc_uid ?? '').trim().toUpperCase()
    if (!b.studentId || !uid) return NextResponse.json({ error: 'Missing student or band code' }, { status: 400 })
    // Deactivate any existing active tag with this UID, then add the new one.
    await g.admin.from('nfc_tags').update({ is_active: false, deactivated_at: new Date().toISOString() }).eq('nfc_uid', uid).eq('is_active', true)
    const { error } = await g.admin.from('nfc_tags').insert({
      tenant_id: g.tenantId, student_id: b.studentId, nfc_uid: uid,
      kind: b.kind || 'wristband', label: t(b.label),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    // Keep students.nfc_uid in sync for the simple-path lookup.
    await g.admin.from('students').update({ nfc_uid: uid }).eq('id', b.studentId).eq('tenant_id', g.tenantId)
    return NextResponse.json({ ok: true })
  }

  if (b.action === 'deactivate_band') {
    if (!b.tagId) return NextResponse.json({ error: 'Missing tag' }, { status: 400 })
    const { error } = await g.admin.from('nfc_tags').update({ is_active: false, deactivated_at: new Date().toISOString() }).eq('id', b.tagId).eq('tenant_id', g.tenantId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
