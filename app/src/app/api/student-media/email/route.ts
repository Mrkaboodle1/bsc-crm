// POST /api/student-media/email { id } — send a coaching photo/video to the parent (as a link).
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { SIGNATURE_TEXT, emailHtml } from '@/lib/email-signature'
import { sendSms, smsConfigured } from '@/lib/sms'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: prof } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!prof?.tenant_id || !['owner', 'manager', 'coach', 'support'].includes(prof.role)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  const { data: m } = await admin.from('student_media')
    .select('url, kind, caption, student:students(first_name, family:families(primary_parent, email, phone))')
    .eq('id', b.id).eq('tenant_id', prof.tenant_id).maybeSingle()
  if (!m) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const stu = (Array.isArray(m.student) ? m.student[0] : m.student) as { first_name: string; family: { primary_parent: string | null; email: string | null; phone: string | null }[] | { primary_parent: string | null; email: string | null; phone: string | null } | null } | null
  const fam = stu ? (Array.isArray(stu.family) ? stu.family[0] : stu.family) : null
  const email = fam?.email, phone = fam?.phone
  if (!email && !phone) return NextResponse.json({ error: 'No parent email or phone on file — add one on the child first.' }, { status: 400 })

  const first = (fam?.primary_parent || '').split(' ')[0] || 'there'
  const what = m.kind === 'video' ? 'a video' : 'a photo'
  const label = m.caption ? ` (${m.caption})` : ''
  const bodyText = `Hi ${first},\n\nYour coach captured ${what}${label} of ${stu?.first_name || 'your child'} in class today — have a look here:\n${m.url}\n\nWe use these to show technique and celebrate progress. Any questions, just reply.`

  // Prefer email; fall back to a text message if there's only a phone.
  if (email && process.env.RESEND_API_KEY) {
    const FROM = process.env.RESEND_FROM_EMAIL || 'admin@bigstarcircus.com.au'
    const FROM_NAME = process.env.RESEND_FROM_NAME || 'Big Star Circus'
    const REPLY_TO = process.env.RESEND_INBOUND_ADDRESS || process.env.RESEND_REPLY_TO || ''
    const html = `${emailHtml(`Hi ${first},\n\nYour coach captured ${what}${label} of ${stu?.first_name || 'your child'} in class today:`)}<p><a href="${m.url}" style="display:inline-block;background:#D72027;color:#fff;font-weight:800;padding:10px 22px;border-radius:24px;text-decoration:none">View ${m.kind}</a></p>`
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${FROM_NAME} <${FROM}>`, to: email, subject: `${stu?.first_name || 'Your child'} at Big Star Circus 🎪`, text: `${bodyText}\n\n${SIGNATURE_TEXT}`, html, ...(REPLY_TO ? { reply_to: REPLY_TO } : {}) }),
    })
    if (!r.ok) return NextResponse.json({ error: 'Could not send email' }, { status: 400 })
    return NextResponse.json({ ok: true, to: email, via: 'email' })
  }
  if (phone) {
    if (!smsConfigured()) return NextResponse.json({ error: 'This family has a phone but no email, and texting needs ClickSend credit. Add an email to send it.' }, { status: 400 })
    const r = await sendSms(phone, `${stu?.first_name || 'Your child'} at Big Star Circus 🎪 — your coach captured ${what}${label}: ${m.url}`)
    if (!r.ok) return NextResponse.json({ error: r.error || 'Could not send text' }, { status: 400 })
    return NextResponse.json({ ok: true, to: phone, via: 'sms' })
  }
  return NextResponse.json({ error: 'Could not send' }, { status: 400 })
}
