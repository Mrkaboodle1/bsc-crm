// /api/workshops/notify-parents — email/text every booked parent on a workshop
// or Kids Night Out day (e.g. a reminder). POST { workshop_id, channel, subject, message }
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { sendSms, smsConfigured } from '@/lib/sms'
import { SIGNATURE_TEXT, emailHtml } from '@/lib/email-signature'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  if (!['owner', 'manager'].includes(p.role)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  if (!b.workshop_id) return NextResponse.json({ error: 'Missing workshop' }, { status: 400 })
  const channel: string = ['both', 'email', 'sms'].includes(b.channel) ? b.channel : 'both'
  const subject: string = (b.subject || 'Big Star Circus reminder').toString().slice(0, 200)
  const message: string = (b.message || '').toString().trim()
  if (!message) return NextResponse.json({ error: 'Write a message' }, { status: 400 })

  const admin = createAdminSupabase()
  const { data: bookings } = await admin.from('workshop_bookings')
    .select('parent_name, email, phone').eq('workshop_id', b.workshop_id).eq('tenant_id', p.tenant_id).eq('status', 'booked')

  const RESEND = process.env.RESEND_API_KEY
  const FROM = process.env.RESEND_FROM_EMAIL || 'admin@bigstarcircus.com.au'
  const FROM_NAME = process.env.RESEND_FROM_NAME || 'Big Star Circus'
  const REPLY_TO = process.env.RESEND_INBOUND_ADDRESS || process.env.RESEND_REPLY_TO || ''

  let emailed = 0, texted = 0, skipped = 0
  for (const c of bookings ?? []) {
    const first = (c.parent_name || '').split(' ')[0] || 'there'
    const personal = message.replace(/\{name\}/gi, first).replace(/\{parent\}/gi, c.parent_name || 'there')
    let did = false
    if ((channel === 'both' || channel === 'email') && c.email && RESEND) {
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: `${FROM_NAME} <${FROM}>`, to: c.email, subject, text: `${personal}\n\n${SIGNATURE_TEXT}`, html: emailHtml(personal), ...(REPLY_TO ? { reply_to: REPLY_TO } : {}) }),
        })
        if (r.ok) { emailed++; did = true }
      } catch { /* ignore */ }
    }
    if ((channel === 'both' || channel === 'sms') && c.phone && smsConfigured()) {
      const r = await sendSms(c.phone, personal); if (r.ok) { texted++; did = true }
    }
    if (!did) skipped++
  }
  return NextResponse.json({ ok: true, emailed, texted, skipped, total: (bookings ?? []).length })
}
