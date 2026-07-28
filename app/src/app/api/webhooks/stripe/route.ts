// /api/webhooks/stripe — Stripe calls this the INSTANT a payment succeeds.
// It auto-creates the booking on the coach roll + admin, marks it paid, alerts
// Telegram, and auto-sends the welcome text/email — all via processCharge (idempotent,
// shared with the 5-minute watcher so nothing is ever done twice).
// Authenticated by ?key=CRON_SECRET baked into the endpoint URL.
import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { processCharge } from '@/lib/booking-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const url = new URL(req.url)
  const secret = process.env.CRON_SECRET
  if (secret && url.searchParams.get('key') !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const event = await req.json().catch(() => null)
  if (event?.type !== 'charge.succeeded') return NextResponse.json({ ok: true, ignored: event?.type || 'none' })
  const c = event.data?.object || {}
  if (c.status !== 'succeeded' || !c.paid) return NextResponse.json({ ok: true, note: 'not a completed payment' })

  const admin = createAdminSupabase()
  const { data: tenant } = await admin.from('tenants').select('id').order('created_at').limit(1).maybeSingle()
  if (!tenant) return NextResponse.json({ ok: true, note: 'no tenant' })

  const r = await processCharge(admin, tenant.id, c)
  return NextResponse.json({ ok: true, ...r })
}
