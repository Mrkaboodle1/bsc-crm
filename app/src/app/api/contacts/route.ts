import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

// POST /api/contacts — create a new contact (families row). Owners + managers.
const SOURCES = new Set(['fb_ad', 'instagram', 'google', 'word_of_mouth', 'school', 'walkin', 'open_day', 'other'])
const STAGES = new Set(['lead', 'trial', 'active', 'paused', 'past', 'lost'])

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  if (!['owner', 'manager'].includes(profile.role)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const name = String(b.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const t = (v: unknown) => { const s = String(v ?? '').trim(); return s || null }
  const source = SOURCES.has(String(b.source)) ? String(b.source) : null
  const stage = STAGES.has(String(b.lifecycle_stage)) ? String(b.lifecycle_stage) : 'lead'
  const tags = Array.isArray(b.tags)
    ? b.tags.map((x: unknown) => String(x).trim()).filter(Boolean)
    : String(b.tags ?? '').split(',').map((x) => x.trim()).filter(Boolean)

  const row = {
    tenant_id: profile.tenant_id,
    family_name: name,
    primary_parent: t(b.primary_parent),
    email: t(b.email),
    phone: t(b.phone),
    emergency_name: t(b.emergency_name),
    emergency_phone: t(b.emergency_phone),
    source,
    lifecycle_stage: stage,
    tags,
  }

  const admin = createAdminSupabase()
  let { data, error } = await admin.from('families').insert(row).select('id').single()
  // If the emergency_name column hasn't been added yet, save without it (don't break Add Contact).
  if (error && /emergency_name/.test(error.message)) {
    const { emergency_name: _omit, ...rest } = row
    void _omit
    ;({ data, error } = await admin.from('families').insert(rest).select('id').single())
  }
  if (error || !data) return NextResponse.json({ error: error?.message || 'Could not save' }, { status: 400 })

  // Create any children entered on the form (1st child / 2nd child) as linked students.
  const childNames = [b.child1, b.child2].map((c) => String(c ?? '').trim()).filter(Boolean)
  if (childNames.length) {
    const kids = childNames.map((full) => {
      const [first, ...rest] = full.split(' ')
      return { tenant_id: profile.tenant_id, family_id: data.id, first_name: first, last_name: rest.join(' ') || null }
    })
    await admin.from('students').insert(kids)
  }

  return NextResponse.json({ ok: true, id: data.id })
}

// PATCH /api/contacts — edit an existing contact (families row). Owner/manager.
export async function PATCH(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  if (!['owner', 'manager'].includes(profile.role)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const t = (v: unknown) => { const s = String(v ?? '').trim(); return s || null }
  const patch: Record<string, unknown> = {}
  if ('family_name' in b) { const v = String(b.family_name ?? '').trim(); if (!v) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 }); patch.family_name = v }
  if ('primary_parent' in b) patch.primary_parent = t(b.primary_parent)
  if ('email' in b) patch.email = t(b.email)
  if ('phone' in b) patch.phone = t(b.phone)
  if ('emergency_phone' in b) patch.emergency_phone = t(b.emergency_phone)
  if ('address' in b) patch.address = t(b.address)
  if ('source' in b) patch.source = SOURCES.has(String(b.source)) ? String(b.source) : null
  if ('lifecycle_stage' in b && STAGES.has(String(b.lifecycle_stage))) patch.lifecycle_stage = String(b.lifecycle_stage)
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const admin = createAdminSupabase()
  const { error } = await admin.from('families').update(patch).eq('id', b.id).eq('tenant_id', profile.tenant_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/contacts?id=<familyId> — remove a contact and its linked kids,
// enrolments and attendance so it never fails on a foreign-key link. Owner/manager.
export async function DELETE(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  if (!['owner', 'manager'].includes(profile.role)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createAdminSupabase()
  const tid = profile.tenant_id

  // Confirm the family belongs to this tenant before touching anything
  const { data: fam } = await admin.from('families').select('id').eq('id', id).eq('tenant_id', tid).maybeSingle()
  if (!fam) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  // Children first (attendance → enrolments → students → family)
  const { data: kids } = await admin.from('students').select('id').eq('family_id', id).eq('tenant_id', tid)
  const kidIds = (kids ?? []).map((k) => k.id)
  if (kidIds.length) {
    await admin.from('attendance').delete().in('student_id', kidIds)
    await admin.from('enrolments').delete().in('student_id', kidIds)
    await admin.from('students').delete().in('id', kidIds).eq('tenant_id', tid)
  }
  // Other family-linked rows that would block the delete
  await admin.from('appointments').delete().eq('related_family_id', id).eq('tenant_id', tid)

  const { error } = await admin.from('families').delete().eq('id', id).eq('tenant_id', tid)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
