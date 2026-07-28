import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { scoreSuburb, scoreVenue, modelSatellite, DEFAULT_FINANCE } from '@/lib/expansion'

export const runtime = 'nodejs'

// One endpoint for the whole radar. ?table=suburbs|venues|competitors|community|leads|tasks
// GET list · POST create · PATCH update · DELETE remove. Owner/manager only.
const TABLES: Record<string, string> = {
  suburbs: 'expansion_suburbs', venues: 'expansion_venues', competitors: 'expansion_competitors',
  community: 'expansion_community', leads: 'expansion_leads', tasks: 'expansion_tasks',
}

async function guard() {
  const user = await verifySession()
  if (!['owner', 'manager'].includes(user.role)) return null
  return user
}
const tableOf = (req: Request) => TABLES[new URL(req.url).searchParams.get('table') || 'suburbs'] ?? null

/** Re-score a suburb from everything we know about it. */
export async function rescore(admin: ReturnType<typeof createAdminSupabase>, tenantId: string, suburbId: string) {
  const [{ data: s }, { data: venues }, { data: comps }, { data: community }, { data: leads }] = await Promise.all([
    admin.from('expansion_suburbs').select('*').eq('id', suburbId).maybeSingle(),
    admin.from('expansion_venues').select('score').eq('suburb_id', suburbId),
    admin.from('expansion_competitors').select('pressure_score').eq('suburb_id', suburbId),
    admin.from('expansion_community').select('audience_size').eq('suburb_id', suburbId),
    admin.from('expansion_leads').select('outcome').eq('suburb_id', suburbId),
  ])
  if (!s) return null

  const venueScores = (venues ?? []).map((v) => v.score).filter((n): n is number => typeof n === 'number')
  const pressures = (comps ?? []).map((c) => c.pressure_score).filter((n): n is number => typeof n === 'number')
  const reach = (community ?? []).reduce((n, c) => n + (c.audience_size ?? 0), 0)
  const L = leads ?? []

  // Model the money using whatever we know (venue rate if we have one).
  const bestRate = 35
  const fin = modelSatellite({ ...DEFAULT_FINANCE, hallRate: bestRate })

  const { score, breakdown, missing } = scoreSuburb({
    children_5_16: s.children_5_16, population_growth_pct: s.population_growth_pct,
    primary_schools: s.primary_schools, distance_km: s.distance_km, travel_minutes_pm: s.travel_minutes_pm,
    median_income: s.median_income, homeschool_activity: s.homeschool_activity, ndis_activity: s.ndis_activity,
    qualifiedLeads: L.length,
    trialBookings: L.filter((l) => ['booked_trial', 'attended', 'joined'].includes(l.outcome)).length,
    venueBest: venueScores.length ? Math.max(...venueScores) : null,
    venueCount: venueScores.length,
    competitorPressure: pressures.length ? pressures.reduce((a, b) => a + b, 0) / pressures.length : undefined,
    communityReach: reach,
    weeklyMargin: fin.weeklyMargin,
  })

  const confidence = missing.length >= 5 ? 'low' : missing.length >= 2 ? 'medium' : 'high'
  await admin.from('expansion_suburbs')
    .update({ score, score_breakdown: { ...breakdown, missing }, confidence, updated_at: new Date().toISOString() })
    .eq('id', suburbId)
  return { score, breakdown, missing, confidence }
}

export async function GET(req: Request) {
  const user = await guard(); if (!user) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const table = tableOf(req); if (!table) return NextResponse.json({ error: 'Unknown table' }, { status: 400 })
  const suburbId = new URL(req.url).searchParams.get('suburb_id')
  const admin = createAdminSupabase()
  let q = admin.from(table).select('*').eq('tenant_id', user.tenantId)
  if (suburbId && table !== 'expansion_suburbs') q = q.eq('suburb_id', suburbId)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message, setup: true }, { status: 400 })
  return NextResponse.json({ ok: true, rows: data ?? [] })
}

export async function POST(req: Request) {
  const user = await guard(); if (!user) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const table = tableOf(req); if (!table) return NextResponse.json({ error: 'Unknown table' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  const admin = createAdminSupabase()

  const row: Record<string, unknown> = { ...body, tenant_id: user.tenantId }
  delete row.id
  if (table === 'expansion_venues') row.score = scoreVenue(body).score

  const { data, error } = await admin.from(table).insert(row).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (body.suburb_id) await rescore(admin, user.tenantId, body.suburb_id)
  return NextResponse.json({ ok: true, row: data })
}

export async function PATCH(req: Request) {
  const user = await guard(); if (!user) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const table = tableOf(req); if (!table) return NextResponse.json({ error: 'Unknown table' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()

  const patch: Record<string, unknown> = { ...body }
  delete patch.id; delete patch.tenant_id
  if (table === 'expansion_venues') patch.score = scoreVenue({ ...body }).score
  if (table === 'expansion_suburbs') patch.updated_at = new Date().toISOString()

  const { data, error } = await admin.from(table).update(patch).eq('id', body.id).eq('tenant_id', user.tenantId).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const sid = (data as { suburb_id?: string })?.suburb_id ?? (table === 'expansion_suburbs' ? body.id : null)
  if (sid) await rescore(admin, user.tenantId, sid)
  return NextResponse.json({ ok: true, row: data })
}

export async function DELETE(req: Request) {
  const user = await guard(); if (!user) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const url = new URL(req.url)
  const table = tableOf(req); const id = url.searchParams.get('id')
  if (!table || !id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { error } = await admin.from(table).delete().eq('id', id).eq('tenant_id', user.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
