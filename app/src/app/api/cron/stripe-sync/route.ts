import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const maxDuration = 60

// GET /api/cron/stripe-sync — daily. Pulls every Stripe subscription into the
// CRM (subscriptions table), links customers to families, and refreshes each
// family's weekly fee + lifecycle stage so "who's paying" is always accurate.
// Secured by CRON_SECRET.

const TENANT = process.env.BSC_TENANT_ID || '33c7b22a-52c6-444e-9057-d03d5ed3d94e'
const STATUS_MAP: Record<string, string> = {
  active: 'active', trialing: 'active', past_due: 'past_due', unpaid: 'past_due',
  canceled: 'cancelled', paused: 'paused', incomplete: 'incomplete', incomplete_expired: 'cancelled',
}
const last9 = (s?: string | null) => (s || '').replace(/\D/g, '').slice(-9)
const isoDay = (t?: number | null) => (t ? new Date(t * 1000).toISOString().slice(0, 10) : null)

async function stripe(path: string) {
  const r = await fetch('https://api.stripe.com/v1/' + path, { headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } })
  if (!r.ok) throw new Error(`Stripe ${r.status}`)
  return r.json()
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const url = new URL(req.url)
  if (secret) {
    const auth = req.headers.get('authorization') || ''
    if (auth !== `Bearer ${secret}` && url.searchParams.get('key') !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'No Stripe key' }, { status: 500 })
  const admin = createAdminSupabase()

  // 1. Every subscription from Stripe (customer expanded so we can match by email)
  const subs: Record<string, unknown>[] = []
  let after: string | null = null
  for (let i = 0; i < 40; i++) {
    const q = `subscriptions?limit=100&status=all&expand[]=data.customer${after ? `&starting_after=${after}` : ''}`
    const r = await stripe(q)
    const data = (r.data || []) as Record<string, unknown>[]
    subs.push(...data)
    if (!r.has_more || !data.length) break
    after = (data[data.length - 1] as { id: string }).id
  }

  // 2. Family lookup maps
  const fams: Array<{ id: string; email: string | null; phone: string | null; stripe_customer_id: string | null }> = []
  for (let from = 0; from <= 20000; from += 1000) {
    const { data } = await admin.from('families').select('id, email, phone, stripe_customer_id').eq('tenant_id', TENANT).range(from, from + 999)
    if (!data?.length) break
    fams.push(...data)
    if (data.length < 1000) break
  }
  const byCust = new Map<string, string>(), byEmail = new Map<string, string>(), byPhone = new Map<string, string>()
  for (const f of fams) {
    if (f.stripe_customer_id) byCust.set(f.stripe_customer_id, f.id)
    if (f.email) byEmail.set(f.email.toLowerCase(), f.id)
    if (last9(f.phone)) byPhone.set(last9(f.phone), f.id)
  }

  // 3. Build rows + backfill customer links
  const rows: Record<string, unknown>[] = []
  const weeklyByFamily = new Map<string, number>()
  let noMatch = 0, newlyLinked = 0
  for (const s of subs as Array<Record<string, any>>) {
    const cust = typeof s.customer === 'object' ? s.customer : { id: s.customer }
    const famId = byCust.get(cust.id) || (cust.email && byEmail.get(String(cust.email).toLowerCase())) || (cust.phone && byPhone.get(last9(cust.phone)))
    if (!famId) { noMatch++; continue }
    if (!byCust.has(cust.id)) {
      await admin.from('families').update({ stripe_customer_id: cust.id }).eq('id', famId)
      byCust.set(cust.id, famId); newlyLinked++
    }
    const item = s.items?.data?.[0]
    const amount = (item?.price?.unit_amount || 0) / 100
    const interval = item?.price?.recurring?.interval
    const weekly = interval === 'week' ? amount : interval === 'month' ? +(amount * 12 / 52).toFixed(2) : interval === 'year' ? +(amount / 52).toFixed(2) : amount
    const status = STATUS_MAP[s.status] || 'incomplete'
    if (status === 'active') weeklyByFamily.set(famId, (weeklyByFamily.get(famId) || 0) + weekly)
    rows.push({
      tenant_id: TENANT, family_id: famId, stripe_subscription_id: s.id, stripe_price_id: item?.price?.id || null,
      weekly_amount: weekly, status,
      current_period_start: isoDay(s.current_period_start), current_period_end: isoDay(s.current_period_end),
      next_charge_date: s.cancel_at_period_end ? null : isoDay(s.current_period_end),
      started_at: s.start_date ? new Date(s.start_date * 1000).toISOString() : null,
      cancelled_at: s.canceled_at ? new Date(s.canceled_at * 1000).toISOString() : null,
      cancellation_reason: s.cancellation_details?.reason || null, updated_at: new Date().toISOString(),
    })
  }

  // 4. Upsert subscriptions
  let written = 0
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await admin.from('subscriptions').upsert(rows.slice(i, i + 100), { onConflict: 'stripe_subscription_id' })
    if (!error) written += Math.min(100, rows.length - i)
  }

  // 5. Refresh each family's weekly fee + lifecycle so the roll shows the truth
  let famUpdated = 0
  for (const [famId, weekly] of weeklyByFamily) {
    await admin.from('families').update({ weekly_fee_total: weekly, lifecycle_stage: 'active' }).eq('id', famId)
    famUpdated++
  }
  // families whose only subs are cancelled → mark past (never touch leads/prospects)
  const withActive = new Set(weeklyByFamily.keys())
  const { data: cancelledFams } = await admin.from('subscriptions').select('family_id').eq('tenant_id', TENANT).neq('status', 'active')
  const lapsed = [...new Set((cancelledFams ?? []).map((r) => r.family_id))].filter((id) => !withActive.has(id))
  for (const id of lapsed) {
    await admin.from('families').update({ weekly_fee_total: 0, lifecycle_stage: 'past' }).eq('id', id).eq('lifecycle_stage', 'active')
  }

  const counts: Record<string, number> = {}
  for (const r of rows) counts[String(r.status)] = (counts[String(r.status)] || 0) + 1

  return NextResponse.json({ ok: true, pulled: subs.length, written, noMatch, newlyLinked, familiesUpdated: famUpdated, lapsed: lapsed.length, byStatus: counts })
}
