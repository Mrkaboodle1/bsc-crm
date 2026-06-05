import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

// /api/classes — create (POST) or update (PATCH) a class / private lesson.
// Owners + managers only.
const norm = (b: Record<string, unknown>) => {
  const t = (v: unknown) => (v == null || v === '' ? null : v)
  const n = (v: unknown) => (v == null || v === '' ? null : Number(v))
  let start = b.start_time ? String(b.start_time) : null
  if (start && start.length === 5) start = start + ':00' // HH:MM -> HH:MM:SS
  return {
    name: t(b.name) as string | null,
    discipline: t(b.discipline) as string | null,
    day_of_week: n(b.day_of_week),
    start_time: start,
    duration_minutes: n(b.duration_minutes) ?? 60,
    age_min: n(b.age_min),
    age_max: n(b.age_max),
    capacity: n(b.capacity) ?? 10,
    weekly_fee: n(b.weekly_fee),
    primary_coach_id: t(b.primary_coach_id) as string | null,
    status: (t(b.status) as string | null) ?? 'active',
  }
}

async function guard(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) }
  const { data: profile } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!profile?.tenant_id) return { error: NextResponse.json({ error: 'No tenant' }, { status: 403 }) }
  if (!['owner', 'manager'].includes(profile.role)) return { error: NextResponse.json({ error: 'Not allowed' }, { status: 403 }) }
  return { tenantId: profile.tenant_id as string, admin: createAdminSupabase() }
}

export async function POST(req: Request) {
  const g = await guard(req); if ('error' in g) return g.error
  const body = await req.json().catch(() => ({}))
  const row = norm(body)
  if (!row.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  const { data, error } = await g.admin.from('classes').insert({ ...row, tenant_id: g.tenantId }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(req: Request) {
  const g = await guard(req); if ('error' in g) return g.error
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const row = norm(body)
  const { error } = await g.admin.from('classes').update(row).eq('id', body.id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
