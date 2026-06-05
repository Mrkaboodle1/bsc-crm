import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

// /api/classes — create (POST), update (PATCH) or remove (DELETE) a class /
// private lesson. Owners + managers only.
const t = (v: unknown) => (v == null || v === '' ? null : v)
const n = (v: unknown) => (v == null || v === '' ? null : Number(v))
const normTime = (v: unknown) => {
  let s = v ? String(v) : null
  if (s && s.length === 5) s = s + ':00' // HH:MM -> HH:MM:SS
  return s
}

// Full row for INSERT (all defaults applied).
const norm = (b: Record<string, unknown>) => ({
  name: t(b.name) as string | null,
  discipline: t(b.discipline) as string | null,
  day_of_week: n(b.day_of_week),
  start_time: normTime(b.start_time),
  duration_minutes: n(b.duration_minutes) ?? 60,
  age_min: n(b.age_min),
  age_max: n(b.age_max),
  capacity: n(b.capacity) ?? 10,
  weekly_fee: n(b.weekly_fee),
  primary_coach_id: t(b.primary_coach_id) as string | null,
  status: (t(b.status) as string | null) ?? 'active',
})

// Partial update — ONLY touches keys actually present in the body, so a
// drag-to-reschedule (just day_of_week) never wipes the other fields.
const buildUpdate = (b: Record<string, unknown>) => {
  const out: Record<string, unknown> = {}
  const has = (k: string) => Object.prototype.hasOwnProperty.call(b, k)
  if (has('name')) out.name = t(b.name)
  if (has('discipline')) out.discipline = t(b.discipline)
  if (has('day_of_week')) out.day_of_week = n(b.day_of_week)
  if (has('start_time')) out.start_time = normTime(b.start_time)
  if (has('duration_minutes')) out.duration_minutes = n(b.duration_minutes) ?? 60
  if (has('age_min')) out.age_min = n(b.age_min)
  if (has('age_max')) out.age_max = n(b.age_max)
  if (has('capacity')) out.capacity = n(b.capacity) ?? 10
  if (has('weekly_fee')) out.weekly_fee = n(b.weekly_fee)
  if (has('primary_coach_id')) out.primary_coach_id = t(b.primary_coach_id)
  if (has('status')) out.status = t(b.status)
  return out
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
  const row = buildUpdate(body)
  if (Object.keys(row).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  const { error } = await g.admin.from('classes').update(row).eq('id', body.id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const g = await guard(req); if ('error' in g) return g.error
  const { searchParams } = new URL(req.url)
  let id = searchParams.get('id')
  if (!id) { const body = await req.json().catch(() => ({})); id = body.id }
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  // Remove the class. Enrolments/attendance reference it, so soft-archive if a
  // hard delete is blocked by a foreign key — either way it leaves the schedule.
  const del = await g.admin.from('classes').delete().eq('id', id).eq('tenant_id', g.tenantId)
  if (del.error) {
    const arch = await g.admin.from('classes').update({ status: 'archived' }).eq('id', id).eq('tenant_id', g.tenantId)
    if (arch.error) return NextResponse.json({ error: arch.error.message }, { status: 400 })
    return NextResponse.json({ ok: true, archived: true })
  }
  return NextResponse.json({ ok: true })
}
