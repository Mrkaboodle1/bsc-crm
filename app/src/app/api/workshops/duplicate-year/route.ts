// /api/workshops/duplicate-year — copy a whole year of workshop/KNO/event days
// to the next year (fresh: no bookings, no attendance, no staff).
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

const shiftYear = (d: string | null, diff: number) => d ? `${parseInt(d.slice(0, 4), 10) + diff}${d.slice(4)}` : null

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  const from = parseInt(b.from_year, 10)
  const to = parseInt(b.to_year, 10) || from + 1
  if (!from) return NextResponse.json({ error: 'Pick a year to copy' }, { status: 400 })
  const admin = createAdminSupabase()

  // Don't duplicate into a year that already has days
  const { count: existing } = await admin.from('holiday_workshops').select('id', { count: 'exact', head: true })
    .eq('tenant_id', g.tenantId).gte('date', `${to}-01-01`).lte('date', `${to}-12-31`)
  if ((existing ?? 0) > 0) return NextResponse.json({ error: `${to} already has ${existing} day(s) — delete those first, or they'd double up.` }, { status: 400 })

  const { data: src } = await admin.from('holiday_workshops').select('*')
    .eq('tenant_id', g.tenantId).gte('date', `${from}-01-01`).lte('date', `${from}-12-31`).order('date')
  if (!src || !src.length) return NextResponse.json({ error: `No days found in ${from} to copy.` }, { status: 400 })

  const rows = src.map((w) => ({
    tenant_id: g.tenantId,
    date: shiftYear(w.date, to - from),
    title: w.title, start_time: w.start_time, end_time: w.end_time,
    capacity: w.capacity, member_price: w.member_price, public_price: w.public_price,
    public_opens_at: shiftYear(w.public_opens_at, to - from),
    status: 'open', activity: w.activity ?? null, kind: w.kind ?? 'workshop',
  }))
  const { error } = await admin.from('holiday_workshops').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, created: rows.length, to })
}
