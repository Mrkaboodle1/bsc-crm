// /api/coaches/notify — text + email coaches (availability requests, roster changes).
// POST { coach_ids: string[], channel: 'both'|'email'|'sms', subject, message }
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
  const ids: string[] = Array.isArray(b.coach_ids) ? b.coach_ids : []
  const channel: string = ['both', 'email', 'sms'].includes(b.channel) ? b.channel : 'both'
  const subject: string = (b.subject || 'Big Star Circus — roster').toString().slice(0, 200)
  const message: string = (b.message || '').toString().trim()
  if (!ids.length) return NextResponse.json({ error: 'Pick at least one coach' }, { status: 400 })
  if (!message) return NextResponse.json({ error: 'Write a message' }, { status: 400 })

  const admin = createAdminSupabase()
  const { data: coaches } = await admin.from('coaches').select('id, full_name, email, phone').in('id', ids).eq('tenant_id', p.tenant_id)

  const RESEND = process.env.RESEND_API_KEY
  const FROM = process.env.RESEND_FROM_EMAIL || 'admin@bigstarcircus.com.au'
  const FROM_NAME = process.env.RESEND_FROM_NAME || 'Big Star Circus'
  const REPLY_TO = process.env.RESEND_INBOUND_ADDRESS || process.env.RESEND_REPLY_TO || ''

  const results: Array<{ name: string; email: string; sms: string }> = []
  for (const c of coaches ?? []) {
    let emailStatus = 'skipped', smsStatus = 'skipped'
    const personal = message.replace(/\{name\}/gi, (c.full_name || '').split(' ')[0] || 'there')

    if ((channel === 'both' || channel === 'email') && c.email && RESEND) {
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: `${FROM_NAME} <${FROM}>`, to: c.email, subject, text: `${personal}\n\n${SIGNATURE_TEXT}`, html: emailHtml(personal), ...(REPLY_TO ? { reply_to: REPLY_TO } : {}) }),
        })
        emailStatus = r.ok ? 'sent' : 'failed'
      } catch { emailStatus = 'failed' }
    } else if ((channel === 'both' || channel === 'email') && !c.email) emailStatus = 'no email'

    if ((channel === 'both' || channel === 'sms') && c.phone) {
      if (!smsConfigured()) smsStatus = 'sms not set up'
      else { const r = await sendSms(c.phone, personal); smsStatus = r.ok ? 'sent' : (r.error || 'failed') }
    } else if ((channel === 'both' || channel === 'sms') && !c.phone) smsStatus = 'no phone'

    results.push({ name: c.full_name || '?', email: emailStatus, sms: smsStatus })
  }
  return NextResponse.json({ ok: true, results })
}
