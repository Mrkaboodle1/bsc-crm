// /api/finance/transactions — bank reconcile workspace. Owner/manager.
// GET (?status) list + summary + open invoices for matching.
// PATCH {id, category?, gst?, is_personal?, matched_invoice_id?, note?, action:'reconcile'|'unreconcile'}
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { merchantToken } from '@/lib/bank-categorise'

export const runtime = 'nodejs'

async function guard() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { error: 'Not signed in', status: 401 as const }
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id || !['owner', 'manager'].includes(p.role)) return { error: 'Not allowed', status: 403 as const }
  return { tenantId: p.tenant_id as string }
}

export async function GET(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const admin = createAdminSupabase()
  const status = new URL(req.url).searchParams.get('status') || 'needs_review'

  let q = admin.from('bank_transactions').select('*').eq('tenant_id', g.tenantId).order('txn_date', { ascending: false }).limit(1000)
  if (status === 'needs_review' || status === 'reconciled') q = q.eq('status', status)
  const { data: txns, error } = await q
  if (error) {
    if (error.message.includes('does not exist') || error.message.includes('relation')) return NextResponse.json({ ok: true, missing: true, txns: [], summary: {}, invoices: [] })
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Summary counts (all-time + this month flows).
  const { data: allTxn } = await admin.from('bank_transactions').select('amount, direction, status, txn_date').eq('tenant_id', g.tenantId)
  const month = new Date().toISOString().slice(0, 7)
  let needsReview = 0, reconciled = 0, inMonth = 0, outMonth = 0
  for (const t of allTxn ?? []) {
    if (t.status === 'needs_review') needsReview++; else reconciled++
    if ((t.txn_date || '').slice(0, 7) === month) { if (t.direction === 'in') inMonth += Number(t.amount); else outMonth += Number(t.amount) }
  }
  // Latest balance = bank cash position.
  const { data: latest } = await admin.from('bank_transactions').select('balance, txn_date').eq('tenant_id', g.tenantId).not('balance', 'is', null).order('txn_date', { ascending: false }).limit(1)

  // Open invoices for matching inflows.
  const { data: invoices } = await admin.from('bs_invoices').select('id, number, contact_name, total').eq('tenant_id', g.tenantId).in('status', ['awaiting', 'sent']).order('total')

  return NextResponse.json({
    ok: true,
    txns: txns ?? [],
    invoices: invoices ?? [],
    summary: { needsReview, reconciled, inMonth: Math.round(inMonth * 100) / 100, outMonth: Math.round(outMonth * 100) / 100, cash: latest?.[0]?.balance ?? null },
  })
}

export async function PATCH(req: Request) {
  const g = await guard(); if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()

  const { data: txn } = await admin.from('bank_transactions').select('*').eq('id', b.id).eq('tenant_id', g.tenantId).maybeSingle()
  if (!txn) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const patch: Record<string, unknown> = {}
  if ('category' in b) patch.category = b.category || null
  if ('gst' in b) patch.gst = !!b.gst
  if ('is_personal' in b) patch.is_personal = !!b.is_personal
  if ('matched_invoice_id' in b) patch.matched_invoice_id = b.matched_invoice_id || null
  if ('note' in b) patch.note = String(b.note || '').slice(0, 500) || null
  if (b.action === 'reconcile') patch.status = 'reconciled'
  if (b.action === 'unreconcile') patch.status = 'needs_review'

  const { error } = await admin.from('bank_transactions').update(patch).eq('id', b.id).eq('tenant_id', g.tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Learn: when reconciling with a category (and not personal), remember the rule.
  const finalCat = 'category' in b ? b.category : txn.category
  const finalGst = 'gst' in b ? !!b.gst : txn.gst
  const personal = 'is_personal' in b ? !!b.is_personal : txn.is_personal
  if (b.action === 'reconcile' && finalCat && !personal) {
    const token = merchantToken(txn.description || '')
    if (token && token.length >= 3) {
      await admin.from('categorisation_rules').upsert(
        { tenant_id: g.tenantId, match_text: token, category: finalCat, gst: finalGst },
        { onConflict: 'tenant_id,match_text' },
      )
    }
  }
  return NextResponse.json({ ok: true })
}
