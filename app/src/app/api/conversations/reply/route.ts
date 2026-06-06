import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

// POST /api/conversations/reply — reply to an inbound email via Resend.
// Body: { to, subject, body, emailId, messageId }. Owners + managers.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  if (!['owner', 'manager'].includes(profile.role)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const to = String(b.to ?? '').trim()
  const body = String(b.body ?? '').trim()
  if (!to || !body) return NextResponse.json({ error: 'Missing recipient or message' }, { status: 400 })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Email is not connected yet' }, { status: 400 })
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'admin@bigstarcircus.com.au'
  const fromName = process.env.RESEND_FROM_NAME || 'Big Star Circus'

  const admin = createAdminSupabase()
  const { data: tenant } = await admin.from('tenants').select('email_signature').eq('id', profile.tenant_id).maybeSingle()
  const sigHtml = tenant?.email_signature?.trim() || ''

  const rawSubject = String(b.subject ?? '').trim()
  const subject = rawSubject ? (/^re:/i.test(rawSubject) ? rawSubject : `Re: ${rawSubject}`) : 'Re: your message'

  const bodyHtml = `<div>${esc(body).replace(/\n/g, '<br>')}</div>${sigHtml ? `<br><br>${sigHtml}` : ''}`
  const headers: Record<string, string> = {}
  if (b.messageId) headers['In-Reply-To'] = String(b.messageId)

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `${fromName} <${fromEmail}>`, to: [to], subject, html: bodyHtml, text: body, reply_to: fromEmail, headers }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.id) return NextResponse.json({ error: data.message || data.name || `Send failed (${res.status})` }, { status: 400 })

  // Mark the inbound email read.
  if (b.emailId) await admin.from('email_messages').update({ read_at: new Date().toISOString() }).eq('id', b.emailId).eq('tenant_id', profile.tenant_id)

  return NextResponse.json({ ok: true, id: data.id })
}
