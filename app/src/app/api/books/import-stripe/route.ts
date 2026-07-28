// /api/books/import-stripe — pull succeeded Stripe charges into the Books ledger
// as income (GST estimated at 1/11). Dedupes on the Stripe charge id. Owner/manager.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id || !['owner', 'manager'].includes(p.role)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const STRIPE = process.env.STRIPE_SECRET_KEY
  if (!STRIPE) return NextResponse.json({ error: 'Stripe is not connected on the server' }, { status: 500 })
  const b = await req.json().catch(() => ({}))
  const days = Math.min(400, Math.max(1, Number(b.days) || 120))
  const cutoff = Math.floor((Date.now() - days * 86400000) / 1000)

  const stAuth = 'Basic ' + Buffer.from(STRIPE + ':').toString('base64')
  const stGet = async (u: string) => (await fetch('https://api.stripe.com/v1' + u, { headers: { Authorization: stAuth } })).json()

  const charges: Array<Record<string, unknown>> = []
  let sa: string | null = null, page = 0
  do {
    const j = await stGet(`/charges?limit=100&created[gte]=${cutoff}` + (sa ? `&starting_after=${sa}` : ''))
    if (!j.data) break
    charges.push(...j.data); sa = j.has_more ? (j.data[j.data.length - 1].id as string) : null; page++
  } while (sa && page < 15)

  const admin = createAdminSupabase()
  const rows = charges
    .filter((c) => c.status === 'succeeded' && !c.refunded && Number(c.amount) > 0)
    .map((c) => {
      const amount = Math.round(Number(c.amount)) / 100
      const bd = c.billing_details as { name?: string; email?: string } | null
      return {
        tenant_id: p.tenant_id, date: new Date(Number(c.created) * 1000).toISOString().slice(0, 10),
        direction: 'in' as const, amount, gst: Math.round((amount / 11) * 100) / 100,
        category: 'Stripe income', description: (c.description as string) || null,
        party: bd?.name || bd?.email || null, source: 'stripe' as const, ext_id: c.id as string,
      }
    })
  if (!rows.length) return NextResponse.json({ ok: true, imported: 0 })

  // Upsert so re-importing never double-counts (unique tenant_id + ext_id).
  const { error } = await admin.from('book_transactions').upsert(rows, { onConflict: 'tenant_id,ext_id', ignoreDuplicates: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, imported: rows.length })
}
