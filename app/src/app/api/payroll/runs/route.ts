// /api/payroll/runs — fortnightly pay runs + their per-person lines. Owner/manager.
// GET (list runs+items) · POST {pay_date} (create + seed lines from active people)
// PATCH {id,...} (run) · PATCH {item:{...}} (a line) · DELETE (?id run)
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

async function guard() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: 'Not signed in', status: 401 as const }
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id || !['owner', 'manager'].includes(p.role)) return { error: 'Not allowed', status: 403 as const }
  return { tenantId: p.tenant_id as string }
}
const num = (v: unknown) => { const n = Number(v); return isFinite(n) ? Math.round(n * 100) / 100 : 0 }
const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
// Payday Super: super must reach the fund within 7 BUSINESS days of payday.
// (Weekends skipped; public holidays not counted — best practice is to pay on payday.)
const addBusinessDays = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00'); let added = 0; while (added < n) { d.setDate(d.getDate() + 1); const wd = d.getDay(); if (wd !== 0 && wd !== 6) added++ } return d.toISOString().slice(0, 10) }

export async function GET() {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const admin = createAdminSupabase()
  const { data: runs } = await admin.from('pay_runs').select('*').eq('tenant_id', g.tenantId).order('pay_date', { ascending: false })
  const ids = (runs ?? []).map((r) => r.id)
  const { data: items } = ids.length ? await admin.from('pay_items').select('*').in('pay_run_id', ids) : { data: [] }
  const byRun: Record<string, unknown[]> = {}
  for (const it of items ?? []) (byRun[it.pay_run_id] ||= []).push(it)
  return NextResponse.json({ ok: true, runs: (runs ?? []).map((r) => ({ ...r, items: byRun[r.id] ?? [] })) })
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.pay_date) return NextResponse.json({ error: 'Pick a pay date' }, { status: 400 })
  const admin = createAdminSupabase()
  const { data: run, error } = await admin.from('pay_runs').insert({
    tenant_id: g.tenantId, pay_date: b.pay_date,
    period_start: addDays(b.pay_date, -13), period_end: b.pay_date, super_due: addBusinessDays(b.pay_date, 7),
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  // Seed a line per active person at their usual amount, with 12% super.
  const { data: people } = await admin.from('payroll_people').select('*').eq('tenant_id', g.tenantId).eq('active', true)
  const items = (people ?? []).map((p) => {
    const gross = Number(p.default_amount) || 0
    return { tenant_id: g.tenantId, pay_run_id: run.id, person_id: p.id, name: p.name, gross, super: p.super_applies ? Math.round(gross * (Number(p.super_rate) || 12)) / 100 : 0 }
  })
  if (items.length) await admin.from('pay_items').insert(items)
  const { data: full } = await admin.from('pay_items').select('*').eq('pay_run_id', run.id)
  return NextResponse.json({ ok: true, run: { ...run, items: full ?? [] } })
}

export async function PATCH(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  const admin = createAdminSupabase()
  if (b.item && b.item.id) {
    const it = b.item
    const patch: Record<string, unknown> = {}
    if ('gross' in it) patch.gross = num(it.gross)
    if ('super' in it) patch.super = num(it.super)
    if ('wage_paid' in it) patch.wage_paid = !!it.wage_paid
    if ('super_paid' in it) patch.super_paid = !!it.super_paid
    const { error } = await admin.from('pay_items').update(patch).eq('id', it.id).eq('tenant_id', g.tenantId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const patch: Record<string, unknown> = {}
  if ('status' in b && ['open', 'paid'].includes(b.status)) patch.status = b.status
  if ('pay_date' in b) { patch.pay_date = b.pay_date; patch.period_start = addDays(b.pay_date, -13); patch.period_end = b.pay_date; patch.super_due = addDays(b.pay_date, 7) }
  const { error } = await admin.from('pay_runs').update(patch).eq('id', b.id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { error } = await admin.from('pay_runs').delete().eq('id', id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
