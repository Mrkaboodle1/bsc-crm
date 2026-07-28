// /api/cron/booking-watch — backstop sweep (every 5 min via Supabase pg_cron; daily on Vercel).
// Stripe: each new paid charge → processCharge (auto-create booking + roll + paid + Telegram +
// welcome text/email, idempotent with the instant webhook). Tectonic forms: free-trial alerts.
// Per-source cursor in integration_state stops anything being handled twice. Secured by CRON_SECRET.
import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { processCharge } from '@/lib/booking-sync'
import { sendTelegram, telegramConfigured, tgEscape } from '@/lib/telegram'
import { sendEmail } from '@/lib/email'
import { sendSms } from '@/lib/sms'
import { syncTectonicContacts } from '@/lib/tectonic-sync'
import { runTrialIntake } from '@/lib/trial-intake'
import { enrollFreeTrial } from '@/lib/sequence'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function stripeCharges(sinceUnix: number) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return []
  const r = await fetch(`https://api.stripe.com/v1/charges?limit=100&created[gt]=${sinceUnix}`, { headers: { Authorization: `Bearer ${key}` } })
  if (!r.ok) return []
  const d = await r.json()
  return (d.data || []).filter((c: { status: string; paid: boolean }) => c.status === 'succeeded' && c.paid)
}

async function ghlSubmissions(sinceUnix: number) {
  const pit = process.env.GHL_PIT, loc = process.env.GHL_LOCATION_ID
  if (!pit || !loc) return [] as Array<{ ref: string; kind: string; title: string; body: string; email: string; firstName: string; phone: string }>
  const H = { Authorization: `Bearer ${pit}`, Version: '2021-07-28', Accept: 'application/json' }
  const forms: Record<string, string> = {}
  try { const fr = await fetch(`https://services.leadconnectorhq.com/forms/?locationId=${loc}&limit=100`, { headers: H }); if (fr.ok) { const fd = await fr.json(); for (const f of fd.forms || []) forms[f.id] = (f.name || '').trim() } } catch {}
  const r = await fetch(`https://services.leadconnectorhq.com/forms/submissions?locationId=${loc}&limit=50`, { headers: H })
  if (!r.ok) return []
  const d = await r.json()
  const out: Array<{ ref: string; kind: string; title: string; body: string; email: string; firstName: string; phone: string }> = []
  for (const s of d.submissions || []) {
    const ts = Math.floor(new Date(s.createdAt || s.submittedAt || 0).getTime() / 1000)
    if (!ts || ts <= sinceUnix) continue
    const formName: string = forms[s.formId] || 'Form'
    const who: string = s.name || s.email || 'Someone'
    const isTrial = /trial/i.test(formName)
    out.push({ ref: String(s.id), kind: isTrial ? 'trial' : 'other', title: `New ${isTrial ? 'free trial' : 'form'} — ${formName}`, body: who, email: (s.email || '').toLowerCase(), firstName: String(s.name || '').split(' ')[0] || '', phone: s.phone || '' })
  }
  return out
}

export async function POST(req: Request) { return run(req) }
export async function GET(req: Request) { return run(req) }

async function run(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') || ''
    const url = new URL(req.url)
    if (auth !== `Bearer ${secret}` && url.searchParams.get('key') !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = createAdminSupabase()
  const { data: tenant } = await admin.from('tenants').select('id').order('created_at').limit(1).maybeSingle()
  if (!tenant) return NextResponse.json({ ok: true, note: 'no tenant' })
  const tid = tenant.id
  const now = Math.floor(Date.now() / 1000)

  const { data: states } = await admin.from('integration_state').select('key,value').eq('tenant_id', tid)
  const cur: Record<string, string> = {}
  for (const s of states || []) cur[s.key] = s.value ?? ''
  const sinceStripe = cur.watch_stripe_ts ? Number(cur.watch_stripe_ts) : now
  const sinceGhl = cur.watch_ghl_ts ? Number(cur.watch_ghl_ts) : now

  // Stripe → full auto-sync per charge (idempotent).
  let handled = 0, created = 0
  try {
    const charges = await stripeCharges(sinceStripe)
    for (const c of charges) { const r = await processCharge(admin, tid, c); if (!r.duplicate) { handled++; created += r.created || 0 } }
  } catch {}

  // Tectonic free-trial / form alerts + auto-enrol trials into the nurture sequence.
  let trials = 0, enrolled = 0
  try {
    const subs = await ghlSubmissions(sinceGhl)
    for (const s of subs) {
      const ins = await admin.from('owner_alerts').insert({ tenant_id: tid, kind: s.kind, source: 'tectonic', ref: s.ref, title: s.title, body: s.body, sent_telegram: false }).select('id').single()
      if (ins.error) continue
      trials++
      if (telegramConfigured()) { const r = await sendTelegram(`✨ <b>${tgEscape(s.title)}</b>\n${tgEscape(s.body)}`); if (r.ok) await admin.from('owner_alerts').update({ sent_telegram: true }).eq('id', ins.data!.id) }
      // Auto-enrol every new free trial into the 5-email nurture sequence.
      if (s.kind === 'trial' && s.email) { try { await enrollFreeTrial(admin as never, tid, { email: s.email, firstName: s.firstName, phone: s.phone }); enrolled++ } catch {} }
    }
  } catch {}

  // Scheduled messages that are now due (free-trial follow-ups, reminders, "send Friday" etc.)
  let scheduled = 0
  try {
    const { data: due } = await admin.from('scheduled_messages').select('*').eq('tenant_id', tid).eq('status', 'pending').lte('send_at', new Date().toISOString()).limit(25)
    for (const m of due ?? []) {
      let ok = false, err: string | null = null
      if (m.channel === 'sms' && m.to_phone) { const r = await sendSms(m.to_phone, m.body_text || ''); ok = r.ok; err = r.error || null }
      else if (m.to_email) { const tag = (String(m.context || '').match(/\b(ft\d)\b/) || [])[1]; const r = await sendEmail(m.to_email, m.subject || 'BigStar Circus', m.body_html || m.body_text || '', tag); ok = r.ok; err = r.error || null }
      else err = 'no recipient'
      await admin.from('scheduled_messages').update({ status: ok ? 'sent' : 'failed', sent_at: ok ? new Date().toISOString() : null, error: ok ? null : err }).eq('id', m.id)
      if (ok) scheduled++
    }
  } catch {}

  // Hourly: keep contacts + form/waiver data synced from Tectonic (insert-only, cheap).
  let tectonic: { contacts: number; forms: number } | null = null
  let intake: { studentsCreated: number; enrolled: number } | null = null
  try {
    if (now - Number(cur.last_tectonic_sync || 0) > 3600) {
      tectonic = await syncTectonicContacts(admin, tid)
      // …then turn brand-new free-trial forms into real kids on the real roll.
      // Only the last 7 days, and only when the form names an actual class —
      // otherwise old enquiries who never showed would flood the rolls.
      const r = await runTrialIntake(admin, tid, { sinceDays: 7 })
      intake = { studentsCreated: r.studentsCreated, enrolled: r.enrolled }
      await admin.from('integration_state').upsert({ tenant_id: tid, key: 'last_tectonic_sync', value: String(now), updated_at: new Date().toISOString() }, { onConflict: 'tenant_id,key' })
    }
  } catch {}

  const nextTs = String(now - 120)
  await admin.from('integration_state').upsert(
    [{ tenant_id: tid, key: 'watch_stripe_ts', value: nextTs, updated_at: new Date().toISOString() },
     { tenant_id: tid, key: 'watch_ghl_ts', value: nextTs, updated_at: new Date().toISOString() }],
    { onConflict: 'tenant_id,key' },
  )
  return NextResponse.json({ ok: true, stripe_handled: handled, bookings_created: created, trials, enrolled, scheduled, tectonic, intake })
}
