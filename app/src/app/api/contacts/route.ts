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
    source,
    lifecycle_stage: stage,
    tags,
  }

  const admin = createAdminSupabase()
  const { data, error } = await admin.from('families').insert(row).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id })
}
