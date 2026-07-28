import 'server-only'
import { createAdminSupabase } from './supabase-admin'
import { sendTelegram, telegramConfigured, tgEscape } from './telegram'
import { sendWelcome } from './welcome-messages'

// Turns a succeeded Stripe charge into a real booking on the coach roll + admin,
// marks it paid, alerts Telegram, and auto-sends the welcome text/email — once.
// Idempotent: the first writer of owner_alerts(charge) does the work; re-runs no-op.

type Admin = ReturnType<typeof createAdminSupabase>
type Charge = { id: string; amount: number; created?: number; description?: string; billing_details?: { name?: string; email?: string; phone?: string }; receipt_email?: string }

const money = (n: number) => '$' + (Number(n) || 0).toFixed(2)
const CAP = Number(process.env.BOOKING_CAP) || 25 // warn Rhett when a day reaches this many kids

// Ping once when a day first reaches the cap, so it can be marked SOLD OUT in time.
async function capacityCheck(admin: Admin, tenantId: string, day: Day) {
  const { data } = await admin.from('workshop_attendance').select('id').eq('workshop_id', day.id)
  const count = (data ?? []).length
  if (count < CAP) return
  const stateKey = `cap:${day.id}`
  const { data: st } = await admin.from('integration_state').select('key').eq('tenant_id', tenantId).eq('key', stateKey).maybeSingle()
  if (st) return // already warned about this day
  await admin.from('integration_state').insert({ tenant_id: tenantId, key: stateKey, value: String(count), updated_at: new Date().toISOString() })
  if (telegramConfigured()) {
    const dt = new Date(day.date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
    await sendTelegram(`⚠️ <b>${dt} is now at ${count} kids</b>\nThat's at your ${CAP} cap — consider marking it SOLD OUT on Tectonic before more book in. 🎪`)
  }
}
const l9 = (s?: string | null) => (s || '').replace(/\D/g, '').slice(-9)
const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
const todayISO = () => new Date(Date.now() + 10 * 3600 * 1000).toISOString().slice(0, 10) // Brisbane

// "Wednesday 8th July" -> ISO dates. Year assumed current; rolls forward if long past.
function parseDates(desc: string): string[] {
  const out: string[] = []
  const re = /(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/gi
  let m: RegExpExecArray | null
  const now = new Date(Date.now() + 10 * 3600 * 1000)
  while ((m = re.exec(desc))) {
    const day = parseInt(m[1], 10), mon = MONTHS[m[2].slice(0, 3).toLowerCase()]
    if (!mon || day < 1 || day > 31) continue
    let year = now.getUTCFullYear()
    let iso = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (iso < todayISO() && (new Date(todayISO()).getTime() - new Date(iso).getTime()) > 45 * 86400000) iso = `${year + 1}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    out.push(iso)
  }
  return [...new Set(out)]
}

type Day = { id: string; date: string; isKno: boolean }
async function resolveDays(admin: Admin, tenantId: string, desc: string): Promise<{ days: Day[]; totalPhrases: number }> {
  const isKno = /kids night out|kno|glow/i.test(desc)
  const today = todayISO()
  if (isKno) {
    const { data } = await admin.from('holiday_workshops').select('id, date, title').eq('tenant_id', tenantId).ilike('title', 'Kids Night Out%').gte('date', today).order('date').limit(1)
    return { days: (data ?? []).map((w) => ({ id: w.id, date: w.date, isKno: true })), totalPhrases: 1 }
  }
  const dates = parseDates(desc)
  if (!dates.length) return { days: [], totalPhrases: 1 }
  const { data } = await admin.from('holiday_workshops').select('id, date, title').eq('tenant_id', tenantId).in('date', dates)
  const days = (data ?? []).filter((w) => w.date >= today).map((w) => ({ id: w.id, date: w.date, isKno: /kids night out/i.test(w.title || '') }))
  return { days, totalPhrases: dates.length }
}

// Real child names + medical from a matching signed waiver, if we have one.
async function findWaiver(admin: Admin, tenantId: string, phone: string | null, email: string | null) {
  const ors: string[] = []
  if (l9(phone)) ors.push(`phone.ilike.*${l9(phone)}*`)
  if (email) ors.push(`email.ilike.*${email.toLowerCase()}*`)
  if (!ors.length) return null
  const { data } = await admin.from('signed_waivers').select('parent_name, children, medical').eq('tenant_id', tenantId).or(ors.join(',')).limit(1)
  const w = data?.[0]
  if (!w) return null
  const kids = String(w.children || '').split(/;|,|&|\band\b/i).map((s) => s.replace(/\d+/g, '').trim()).filter((s) => s.length > 1)
  return { parent: w.parent_name as string | null, kids, medical: (w.medical as string | null) || null }
}

// Best-effort: Tectonic often has the mobile even when Stripe doesn't.
async function ghlPhoneByEmail(email: string): Promise<string | null> {
  const pit = process.env.GHL_PIT, loc = process.env.GHL_LOCATION_ID
  if (!pit || !loc || !email) return null
  try {
    const r = await fetch(`https://services.leadconnectorhq.com/contacts/?locationId=${loc}&query=${encodeURIComponent(email)}&limit=1`, { headers: { Authorization: 'Bearer ' + pit, Version: '2021-07-28', Accept: 'application/json' } })
    if (!r.ok) return null
    const d = await r.json()
    return d.contacts?.[0]?.phone || null
  } catch { return null }
}

async function createForDay(admin: Admin, tenantId: string, day: Day, charge: Charge, ctx: { parent: string; phone: string | null; email: string; waiver: { kids: string[]; medical: string | null } | null }, totalPhrases: number): Promise<number> {
  const { data: existing } = await admin.from('workshop_bookings').select('phone, email').eq('workshop_id', day.id)
  const dupe = (existing ?? []).some((b) => (l9(ctx.phone) && l9(b.phone) === l9(ctx.phone)) || (ctx.email && (b.email || '').toLowerCase() === ctx.email.toLowerCase()))
  if (dupe) return 0
  const spots = charge.amount / 6000 // amount(cents) / (100*60)
  const kids = Math.min(8, Math.max(1, Math.round(spots / (totalPhrases || 1))))
  const first = (ctx.parent || 'Parent').split(' ')[0]
  const names = Array.from({ length: kids }, (_, i) => ctx.waiver?.kids[i] || (kids > 1 ? `${first}'s child ${i + 1}` : `${first}'s child`))
  const { data: bk } = await admin.from('workshop_bookings').insert({
    tenant_id: tenantId, workshop_id: day.id, parent_name: ctx.parent, email: ctx.email || null, phone: ctx.phone,
    child_names: names.join(', '), child_count: kids, is_member: false, status: 'booked', source: 'stripe-auto',
    amount_paid: 60 * kids, paid: true, notes: `Auto-synced from Stripe ${charge.id}.`,
  }).select('id').single()
  const bid = bk?.id
  const att = names.map((n) => ({ tenant_id: tenantId, workshop_id: day.id, booking_id: bid, child_name: n, parent_name: ctx.parent, parent_contact: ctx.phone || ctx.email, medical: ctx.waiver?.medical || null, status: 'expected' }))
  await admin.from('workshop_attendance').insert(att)
  return kids
}

export async function processCharge(admin: Admin, tenantId: string, charge: Charge): Promise<{ duplicate: boolean; created?: number; days?: number; welcome?: { sms: boolean; email: boolean } }> {
  const desc = charge.description || 'Payment'
  const email = (charge.billing_details?.email || charge.receipt_email || '').trim()
  const isKnoDesc = /kids night out|kno|glow/i.test(desc)

  // Idempotency gate — unique (tenant, source, ref) on owner_alerts.
  const alert = { tenant_id: tenantId, kind: isKnoDesc ? 'kno' : 'booking', source: 'stripe', ref: String(charge.id), title: `New ${isKnoDesc ? 'Kids Night Out' : 'booking'} — ${money(charge.amount / 100)}`, body: `${desc}${email ? ` · ${email}` : ''}`, amount: charge.amount / 100, meta: { email, desc, auto: true }, sent_telegram: false }
  const ins = await admin.from('owner_alerts').insert(alert).select('id').single()
  if (ins.error) return { duplicate: true }

  if (telegramConfigured()) { const r = await sendTelegram(`${isKnoDesc ? '🌟' : '🎪'} <b>${tgEscape(alert.title)}</b>\n${tgEscape(alert.body)}`); if (r.ok) await admin.from('owner_alerts').update({ sent_telegram: true }).eq('id', ins.data!.id) }

  const { days, totalPhrases } = await resolveDays(admin, tenantId, desc)
  if (!days.length) return { duplicate: false, created: 0, days: 0 }

  let phone = charge.billing_details?.phone || null
  if (!phone && email) phone = await ghlPhoneByEmail(email)
  const waiver = await findWaiver(admin, tenantId, phone, email)
  const parent = charge.billing_details?.name || waiver?.parent || (email ? email.split('@')[0].replace(/[._]/g, ' ') : 'Parent')

  let created = 0
  const touched: Day[] = []
  for (const d of days) { const k = await createForDay(admin, tenantId, d, charge, { parent, phone, email, waiver }, totalPhrases); created += k; if (k > 0) touched.push(d) }
  for (const d of touched) await capacityCheck(admin, tenantId, d)

  // Auto welcome — only for recent charges, and only if we actually placed them.
  let welcome
  const recent = (Date.now() / 1000 - (charge.created || 0)) < 2 * 86400
  if (recent && created > 0) welcome = await sendWelcome({ phone, email }, days.every((d) => d.isKno))
  return { duplicate: false, created, days: days.length, welcome }
}
