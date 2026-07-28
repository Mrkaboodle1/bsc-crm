import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

// /api/appointments — create (POST), update (PATCH), remove (DELETE) a diary
// event. Owners + managers only.

const TYPES = new Set([
  'show', 'gig', 'private_lesson', 'workshop', 'birthday_party',
  'kno', 'meeting', 'rehearsal', 'personal', 'holiday_programme', 'event', 'other',
])

const t = (v: unknown) => (v == null || v === '' ? null : String(v))
const num = (v: unknown) => (v == null || v === '' ? null : Number(v))

// Build a TIMESTAMPTZ from a Brisbane date + HH:MM time. Brisbane = UTC+10.
function brisbaneISO(date: string, time: string): string | null {
  if (!date) return null
  const [y, mo, d] = date.split('-').map((x) => parseInt(x, 10))
  const [h, mi] = (time || '00:00').split(':').map((x) => parseInt(x, 10))
  if (!y || !mo || !d) return null
  return new Date(Date.UTC(y, mo - 1, d, (h || 0) - 10, mi || 0, 0)).toISOString()
}

function buildRow(b: Record<string, unknown>) {
  const date = t(b.date) ?? ''
  const endDate = t(b.end_date) || date
  const allDay = b.all_day === true || b.all_day === 'true'
  const start = allDay ? brisbaneISO(date, '00:00') : brisbaneISO(date, t(b.start_time) || '09:00')
  const end = allDay ? brisbaneISO(endDate, '23:59') : brisbaneISO(endDate, t(b.end_time) || t(b.start_time) || '10:00')
  return {
    title: t(b.title),
    type: TYPES.has(String(b.type)) ? String(b.type) : 'event',
    start_at: start,
    end_at: end,
    all_day: allDay,
    location: t(b.location),
    description: t(b.description),
    notes: t(b.notes),
    assigned_coach_id: t(b.assigned_coach_id),
    related_family_id: t(b.related_family_id),
    related_student_id: t(b.related_student_id),
    fee: num(b.fee),
    alert_minutes_before: num(b.alert_minutes_before),
  }
}

async function guard() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) }
  const { data: profile } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!profile?.tenant_id) return { error: NextResponse.json({ error: 'No tenant' }, { status: 403 }) }
  if (!['owner', 'manager'].includes(profile.role)) return { error: NextResponse.json({ error: 'Not allowed' }, { status: 403 }) }
  return { tenantId: profile.tenant_id as string, userId: auth.user.id, admin: createAdminSupabase() }
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return g.error
  const body = await req.json().catch(() => ({}))
  const row = buildRow(body)
  if (!row.title) return NextResponse.json({ error: 'Give the event a name' }, { status: 400 })
  if (!row.start_at || !row.end_at) return NextResponse.json({ error: 'A date is required' }, { status: 400 })
  if (row.end_at < row.start_at) return NextResponse.json({ error: 'End must be after start' }, { status: 400 })
  const { data, error } = await g.admin.from('appointments')
    .insert({ ...row, tenant_id: g.tenantId, status: 'scheduled', created_by_user_id: g.userId })
    .select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(req: Request) {
  const g = await guard(); if ('error' in g) return g.error
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const row: Record<string, unknown> = buildRow(body)
  if (!row.title) return NextResponse.json({ error: 'Give the event a name' }, { status: 400 })
  if (!row.start_at || !row.end_at) return NextResponse.json({ error: 'A date is required' }, { status: 400 })
  // Don't clobber the family/student links if the editor didn't send them.
  if (!('related_family_id' in body)) delete row.related_family_id
  if (!('related_student_id' in body)) delete row.related_student_id
  const { error } = await g.admin.from('appointments').update(row).eq('id', body.id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const g = await guard(); if ('error' in g) return g.error
  const { searchParams } = new URL(req.url)
  let id = searchParams.get('id')
  if (!id) { const body = await req.json().catch(() => ({})); id = body.id }
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await g.admin.from('appointments').delete().eq('id', id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
