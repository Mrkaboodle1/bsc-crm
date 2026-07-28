// /api/books/transactions — Big Star Books ledger. Owner/manager only.
// GET (?from&to) · POST (add) · PATCH (edit) · DELETE (?id)
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

const num = (v: unknown) => { const n = Number(v); return isFinite(n) ? Math.round(n * 100) / 100 : 0 }

export async function GET(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const url = new URL(req.url)
  const admin = createAdminSupabase()
  let q = admin.from('book_transactions').select('id, date, direction, amount, gst, category, description, party, source, notes').eq('tenant_id', g.tenantId)
  const from = url.searchParams.get('from'); const to = url.searchParams.get('to')
  if (from) q = q.gte('date', from)
  if (to) q = q.lte('date', to)
  const { data, error } = await q.order('date', { ascending: false }).limit(2000)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, rows: data })
}

export async function POST(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.date || !['in', 'out'].includes(b.direction)) return NextResponse.json({ error: 'Date and in/out required' }, { status: 400 })
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('book_transactions').insert({
    tenant_id: g.tenantId, date: b.date, direction: b.direction,
    amount: num(b.amount), gst: num(b.gst), category: b.category || null,
    description: b.description || null, party: b.party || null, source: 'manual', notes: b.notes || null,
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const patch: Record<string, unknown> = {}
  for (const f of ['date', 'category', 'description', 'party', 'notes', 'direction'] as const) if (f in b) patch[f] = b[f] || null
  if ('amount' in b) patch.amount = num(b.amount)
  if ('gst' in b) patch.gst = num(b.gst)
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  const admin = createAdminSupabase()
  const { error } = await admin.from('book_transactions').update(patch).eq('id', b.id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { error } = await admin.from('book_transactions').delete().eq('id', id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
