// /api/cron/sync-workshops — daily auto-sync of Stripe holiday-workshop bookings
// into the CRM. Runs on a schedule (vercel.json) so numbers stay fresh on their own.
// Secured by CRON_SECRET (Vercel cron sends it as a Bearer token).
import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const ord = (n: number) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]) }
function patternsFor(date: string) {
  const d = new Date(date + 'T00:00:00Z'); const day = d.getUTCDate(); const month = MONTHS[d.getUTCMonth()]
  return [`${ord(day)} ${month}`, `${day} ${month}`]
}

export async function POST(req: Request) { return run(req) }
export async function GET(req: Request) { return run(req) }

async function run(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') || ''
    const url = new URL(req.url)
    if (auth !== `Bearer ${secret}` && url.searchParams.get('key') !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  const STRIPE = process.env.STRIPE_SECRET_KEY
  if (!STRIPE) return NextResponse.json({ error: 'Stripe key not configured on the server' }, { status: 500 })
  const stAuth = 'Basic ' + Buffer.from(STRIPE + ':').toString('base64')
  const stGet = async (u: string) => (await fetch('https://api.stripe.com/v1' + u, { headers: { Authorization: stAuth } })).json()
  const admin = createAdminSupabase()

  const { data: tenant } = await admin.from('tenants').select('id').order('created_at').limit(1).maybeSingle()
  if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 500 })
  const tid = tenant.id

  // Holiday-workshop days within a window (6 months back → 12 ahead)
  const back = new Date(); back.setMonth(back.getMonth() - 6)
  const ahead = new Date(); ahead.setMonth(ahead.getMonth() + 12)
  const { data: days } = await admin.from('holiday_workshops')
    .select('id, date, title, kind').eq('tenant_id', tid)
    .gte('date', back.toISOString().slice(0, 10)).lte('date', ahead.toISOString().slice(0, 10))
  const workshopDays = (days ?? []).filter((d) => !/^Kids Night Out/i.test(d.title) && d.kind !== 'event')
  if (!workshopDays.length) return NextResponse.json({ ok: true, note: 'no workshop days in window', updated: 0 })
  let matchers = workshopDays.map((d) => ({ id: d.id, date: d.date, patterns: patternsFor(d.date) }))
  // Leave alone any day whose roll has been loaded from the master sheet (source='sheet').
  // The sheet is the source of truth there (includes Play On voucher + manual kids), so the
  // Stripe sync must not overwrite or double-count it.
  const { data: sheetRows } = await admin.from('workshop_bookings').select('workshop_id').eq('tenant_id', tid).eq('source', 'sheet')
  const sheetDays = new Set((sheetRows ?? []).map((x) => x.workshop_id))
  matchers = matchers.filter((m) => !sheetDays.has(m.id))

  // Stripe one-off charges over the last 120 days
  const cutoff = Math.floor((Date.now() - 120 * 86400000) / 1000)
  const charges: Array<Record<string, unknown>> = []; let sa: string | null = null, p = 0
  do {
    const j = await stGet(`/charges?limit=100&created[gte]=${cutoff}` + (sa ? `&starting_after=${sa}` : ''))
    if (!j.data) break
    charges.push(...j.data); sa = j.has_more ? (j.data[j.data.length - 1].id as string) : null; p++
  } while (sa && p < 12)

  const rows: Array<Record<string, unknown>> = []
  for (const c of charges) {
    if (c.invoice || c.status !== 'succeeded') continue
    const desc = String(c.description || '')
    if (!/June|July|January|April|September|December|Workshop|Holiday/i.test(desc)) continue
    const amt = (c.amount as number) / 100, slots = Math.round(amt / 60)
    const matched = matchers.filter((m) => m.patterns.some((pt) => desc.toLowerCase().includes(pt.toLowerCase())))
    if (!matched.length) continue
    const bd = c.billing_details as { name?: string; email?: string; phone?: string } | null
    let who = bd?.name || ''
    let email = bd?.email || null
    let phone = bd?.phone || null
    // Stripe keeps the phone on the customer record (not always on the charge), so fetch it.
    if (c.customer) {
      const cu = (await stGet('/customers/' + c.customer)) as { name?: string; email?: string; phone?: string }
      who = who || cu?.name || ''
      email = email || cu?.email || null
      phone = phone || cu?.phone || null
    }
    who = (who || email || 'Stripe booking').replace(/\b(\w+) \1\b/gi, '$1').trim()
    if (matched.length === 1) rows.push({ workshop_id: matched[0].id, parent_name: who, email, phone, child_count: slots, amount_paid: amt })
    else for (const m of matched) rows.push({ workshop_id: m.id, parent_name: who, email, phone, child_count: 1, amount_paid: 60 })
  }

  // rebuild stripe-sourced bookings for these days only
  const ids = matchers.map((m) => m.id)
  await admin.from('workshop_bookings').delete().eq('tenant_id', tid).eq('source', 'stripe').in('workshop_id', ids)
  if (rows.length) {
    await admin.from('workshop_bookings').insert(rows.map((r) => ({ tenant_id: tid, ...r, paid: true, is_member: false, status: 'booked', source: 'stripe' })))
  }
  return NextResponse.json({ ok: true, days: workshopDays.length, bookings: rows.length })
}
