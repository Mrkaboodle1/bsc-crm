// /api/cron/workshop-reminders — runs daily; the afternoon BEFORE a workshop or
// Kids Night Out it emails/texts every booked parent a reminder (drop-off /
// pick-up times + what to bring). Secured by CRON_SECRET.
import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { sendSms, smsConfigured } from '@/lib/sms'
import { SIGNATURE_TEXT, emailHtml } from '@/lib/email-signature'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const t12 = (t: string | null) => {
  if (!t) return ''
  const [h, m] = t.split(':'); const hr = parseInt(h, 10)
  return `${((hr + 11) % 12) + 1}:${m}${hr >= 12 ? 'pm' : 'am'}`
}
const isKno = (title: string) => /^Kids Night Out/i.test(title || '')

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

  // "Tomorrow" in Brisbane (UTC+10, no daylight saving).
  const bne = new Date(Date.now() + 10 * 3600 * 1000)
  bne.setUTCDate(bne.getUTCDate() + 1)
  const tomorrow = bne.toISOString().slice(0, 10)

  const admin = createAdminSupabase()
  const { data: tenant } = await admin.from('tenants').select('id').order('created_at').limit(1).maybeSingle()
  if (!tenant) return NextResponse.json({ ok: true, note: 'no tenant' })

  const { data: days } = await admin.from('holiday_workshops')
    .select('id, date, title, start_time, end_time, status').eq('tenant_id', tenant.id).eq('date', tomorrow)
  const live = (days ?? []).filter((d) => d.status !== 'cancelled')
  if (!live.length) return NextResponse.json({ ok: true, note: 'nothing tomorrow', date: tomorrow })

  const RESEND = process.env.RESEND_API_KEY
  const FROM = process.env.RESEND_FROM_EMAIL || 'admin@bigstarcircus.com.au'
  const FROM_NAME = process.env.RESEND_FROM_NAME || 'Big Star Circus'
  const REPLY_TO = process.env.RESEND_INBOUND_ADDRESS || process.env.RESEND_REPLY_TO || ''
  const niceDate = new Date(tomorrow + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

  let emailed = 0, texted = 0
  for (const d of live) {
    const { data: bookings } = await admin.from('workshop_bookings')
      .select('parent_name, email, phone').eq('workshop_id', d.id).eq('tenant_id', tenant.id).eq('status', 'booked')
    const drop = t12(d.start_time), pick = t12(d.end_time)
    for (const c of bookings ?? []) {
      const first = (c.parent_name || '').split(' ')[0] || 'there'
      const body = isKno(d.title)
        ? `Hi ${first}, just a reminder that Kids Night Out is TOMORROW (${niceDate})! Drop-off ${drop}, pick-up ${pick}. Please send your child with a water bottle. Can't wait to see them! 🎪`
        : `Hi ${first}, just a reminder that the Big Star Holiday Workshop is TOMORROW (${niceDate})! Drop-off ${drop}, pick-up ${pick}. Please pack lunch, morning tea and a water bottle. See you there! 🎪`
      const subject = isKno(d.title) ? `Reminder: Kids Night Out tomorrow!` : `Reminder: Big Star Holiday Workshop tomorrow!`
      if (c.email && RESEND) {
        try {
          const r = await fetch('https://api.resend.com/emails', {
            method: 'POST', headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: `${FROM_NAME} <${FROM}>`, to: c.email, subject, text: `${body}\n\n${SIGNATURE_TEXT}`, html: emailHtml(body), ...(REPLY_TO ? { reply_to: REPLY_TO } : {}) }),
          })
          if (r.ok) emailed++
        } catch { /* ignore */ }
      }
      if (c.phone && smsConfigured()) { const r = await sendSms(c.phone, body); if (r.ok) texted++ }
    }
  }
  return NextResponse.json({ ok: true, date: tomorrow, days: live.length, emailed, texted })
}
