// /api/inbound/email — receives a coach's email reply (from an inbound email
// service) and stores it in the CRM, then forwards a copy to your inbox.
// Works with JSON or form-encoded inbound providers. Secure with INBOUND_SECRET.
import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const emailOf = (s: string) => (s || '').match(/<([^>]+)>/)?.[1] || (s || '').match(/[\w.+-]+@[\w.-]+/)?.[0] || ''
const nameOf = (s: string) => (s || '').replace(/<[^>]+>/, '').replace(/"/g, '').trim() || null

export async function POST(req: Request) {
  // secret check (query ?token= or x-inbound-secret header)
  const secret = process.env.INBOUND_SECRET
  if (secret) {
    const url = new URL(req.url)
    if (url.searchParams.get('token') !== secret && req.headers.get('x-inbound-secret') !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // parse JSON (Resend / generic) or form-encoded payloads
  const ct = req.headers.get('content-type') || ''
  let from = '', subject = '', text = '', to = '', messageId = ''
  const firstStr = (v: unknown): string => Array.isArray(v) ? firstStr(v[0]) : (typeof v === 'string' ? v : (v as { address?: string; email?: string })?.address || (v as { email?: string })?.email || '')
  try {
    if (ct.includes('application/json')) {
      const b = await req.json()
      if (b?.type === 'email.received' && b.data) {
        // Resend inbound webhook
        const d = b.data
        from = firstStr(d.from); subject = d.subject || ''; to = firstStr(d.to)
        // Resend's webhook is metadata-only — fetch the body via the inbound API
        const RKEY = process.env.RESEND_API_KEY
        const eid = d.email_id || d.id
        messageId = String(eid || '')
        if (eid && RKEY) {
          try {
            const e = await (await fetch(`https://api.resend.com/emails/inbound/${eid}`, { headers: { Authorization: `Bearer ${RKEY}` } })).json()
            text = e.text || (e.html ? String(e.html).replace(/<[^>]+>/g, ' ') : '') || ''
          } catch { /* keep metadata only */ }
        }
      } else {
        from = firstStr(b.from) || b.sender || ''
        subject = b.subject || ''
        text = b.text || b['body-plain'] || b.body || (b.html ? String(b.html).replace(/<[^>]+>/g, ' ') : '')
        to = firstStr(b.to)
        messageId = String(b.message_id || b['message-id'] || b.id || '')
      }
    } else {
      const f = await req.formData()
      from = String(f.get('from') || f.get('sender') || '')
      subject = String(f.get('subject') || '')
      text = String(f.get('text') || f.get('body-plain') || f.get('stripped-text') || '')
      to = String(f.get('to') || '')
      messageId = String(f.get('message_id') || f.get('Message-Id') || '')
    }
  } catch { /* ignore parse errors */ }

  const fromEmail = emailOf(from).toLowerCase()
  if (!fromEmail) return NextResponse.json({ ok: true, note: 'no sender' })

  const admin = createAdminSupabase()
  const { data: tenant } = await admin.from('tenants').select('id').order('created_at').limit(1).maybeSingle()
  if (!tenant) return NextResponse.json({ ok: true, note: 'no tenant' })

  // match the sender to a coach (best-effort)
  const { data: coach } = await admin.from('coaches').select('id, full_name').eq('tenant_id', tenant.id).ilike('email', fromEmail).maybeSingle()

  // strip quoted history (keep the new bit) — cut at common reply markers
  const clean = text.split(/\n[>]|On .* wrote:|-----Original Message-----|From: /)[0].trim().slice(0, 8000)

  await admin.from('coach_replies').insert({
    tenant_id: tenant.id, coach_id: coach?.id ?? null,
    from_email: fromEmail, from_name: coach?.full_name || nameOf(from),
    subject: subject.slice(0, 300), body: clean,
  })

  // If the sender is a parent/family, thread the reply into their CRM conversation.
  const { data: fam } = await admin.from('families').select('id').eq('tenant_id', tenant.id).ilike('email', fromEmail).maybeSingle()
  if (fam) {
    const mid = messageId || `inbound-${fromEmail}-${Date.now()}`
    await admin.from('email_messages').upsert({
      tenant_id: tenant.id, message_id: mid,
      from_email: fromEmail, from_name: nameOf(from),
      subject: subject.slice(0, 300), body_text: clean,
      received_at: new Date().toISOString(), matched_family_id: fam.id,
    }, { onConflict: 'tenant_id,message_id' })
  }

  // forward a copy to the owner inbox so they see it there too
  const RESEND = process.env.RESEND_API_KEY
  const FWD = process.env.RESEND_REPLY_TO
  if (RESEND && FWD) {
    const FROM = process.env.RESEND_FROM_EMAIL || 'admin@bigstarcircus.com.au'
    fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `Big Star Circus <${FROM}>`, to: FWD, reply_to: fromEmail, subject: `Coach reply: ${subject}`.slice(0, 200), text: `From ${coach?.full_name || fromEmail}:\n\n${clean}` }),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
