// /api/roster/send — email + text each coach THEIR personal roster
// (classes + holiday workshops + Kids Night Out they're rostered on).
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { sendSms, smsConfigured } from '@/lib/sms'
import { rosterPdfBase64 } from '@/lib/roster-pdf'
import { SIGNATURE_TEXT, emailHtml } from '@/lib/email-signature'

export const runtime = 'nodejs'

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const t12 = (t: string | null) => {
  if (!t) return ''
  const [h, m] = t.split(':'); const hr = parseInt(h, 10)
  return `${((hr + 11) % 12) + 1}:${m}${hr >= 12 ? 'pm' : 'am'}`
}
const niceDate = (d: string) => { const x = new Date(d + 'T00:00:00'); return `${DAY[x.getDay()]} ${x.getDate()}/${x.getMonth() + 1}` }

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: prof } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!prof?.tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  if (!['owner', 'manager'].includes(prof.role)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const ids: string[] = Array.isArray(b.coach_ids) ? b.coach_ids : []
  const channel: string = ['both', 'email', 'sms'].includes(b.channel) ? b.channel : 'both'
  const intro: string = (b.intro || "Here's your upcoming Big Star roster:").toString()
  if (!ids.length) return NextResponse.json({ error: 'Pick at least one coach' }, { status: 400 })

  const admin = createAdminSupabase()
  const tid = prof.tenant_id
  const [{ data: coaches }, { data: cstaff }, { data: classes }, { data: wstaff }, { data: ws }] = await Promise.all([
    admin.from('coaches').select('id, full_name, email, phone').in('id', ids).eq('tenant_id', tid),
    admin.from('class_staff').select('coach_id, class_id').eq('tenant_id', tid),
    admin.from('classes').select('id, name, day_of_week, start_time').eq('tenant_id', tid),
    admin.from('workshop_staff').select('coach_id, workshop_id').eq('tenant_id', tid),
    admin.from('holiday_workshops').select('id, date, title, start_time, end_time').eq('tenant_id', tid).gte('date', new Date().toISOString().slice(0, 10)),
  ])
  const classById = new Map((classes ?? []).map((c) => [c.id, c]))
  const wsById = new Map((ws ?? []).map((w) => [w.id, w]))

  const RESEND = process.env.RESEND_API_KEY
  const FROM = process.env.RESEND_FROM_EMAIL || 'admin@bigstarcircus.com.au'
  const FROM_NAME = process.env.RESEND_FROM_NAME || 'Big Star Circus'
  const REPLY_TO = process.env.RESEND_INBOUND_ADDRESS || process.env.RESEND_REPLY_TO || ''
  const results: Array<{ name: string; items: number; email: string; sms: string }> = []

  for (const c of coaches ?? []) {
    const myClasses = (cstaff ?? []).filter((s) => s.coach_id === c.id).map((s) => classById.get(s.class_id)).filter(Boolean)
    const myWs = (wstaff ?? []).filter((s) => s.coach_id === c.id).map((s) => wsById.get(s.workshop_id)).filter(Boolean) as Array<{ date: string; title: string; start_time: string; end_time: string }>
    const workshops = myWs.filter((w) => !/^Kids Night Out/i.test(w.title))
    const knos = myWs.filter((w) => /^Kids Night Out/i.test(w.title))

    const lines: string[] = []
    if (myClasses.length) { lines.push('CLASSES:'); for (const cl of myClasses) lines.push(`• ${DAY[cl!.day_of_week]} ${t12(cl!.start_time)} — ${cl!.name}`) }
    if (workshops.length) { lines.push('', 'HOLIDAY WORKSHOPS:'); for (const w of workshops.sort((a, z) => a.date.localeCompare(z.date))) lines.push(`• ${niceDate(w.date)} ${t12(w.start_time)}–${t12(w.end_time)}`) }
    if (knos.length) { lines.push('', 'KIDS NIGHT OUT:'); for (const w of knos.sort((a, z) => a.date.localeCompare(z.date))) lines.push(`• ${niceDate(w.date)} ${t12(w.start_time)}–${t12(w.end_time)} (${w.title})`) }

    const itemCount = myClasses.length + myWs.length
    const first = (c.full_name || '').split(' ')[0] || 'there'
    const bodyCore = itemCount === 0
      ? `Hi ${first}, you're not currently rostered on anything upcoming. We'll be in touch.`
      : `Hi ${first},\n\n${intro}\n\n${lines.join('\n')}\n\nLet me know if anything clashes. Thanks!`
    const smsText = `${bodyCore}\n— Rhett, Big Star Circus`
    const emailText = `${bodyCore}\n\n${SIGNATURE_TEXT}`

    let emailStatus = 'skipped', smsStatus = 'skipped'
    if ((channel === 'both' || channel === 'email')) {
      if (!c.email) emailStatus = 'no email'
      else if (!RESEND) emailStatus = 'email not set up'
      else {
        try {
          // attach a PDF of this coach's roster (only if they have shifts)
          let attachments: Array<{ filename: string; content: string }> = []
          if (itemCount > 0) {
            const pdf = await rosterPdfBase64(`${first}'s Roster`, new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), lines)
            attachments = [{ filename: 'Big-Star-Roster.pdf', content: pdf }]
          }
          const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: `${FROM_NAME} <${FROM}>`, to: c.email, subject: 'Your Big Star roster', text: emailText, html: emailHtml(bodyCore), ...(REPLY_TO ? { reply_to: REPLY_TO } : {}), ...(attachments.length ? { attachments } : {}) }) })
          emailStatus = r.ok ? 'sent' : 'failed'
        } catch { emailStatus = 'failed' }
      }
    }
    if ((channel === 'both' || channel === 'sms')) {
      if (!c.phone) smsStatus = 'no phone'
      else if (!smsConfigured()) smsStatus = 'sms not set up'
      else { const r = await sendSms(c.phone, smsText); smsStatus = r.ok ? 'sent' : (r.error || 'failed') }
    }
    results.push({ name: c.full_name || '?', items: itemCount, email: emailStatus, sms: smsStatus })
  }
  return NextResponse.json({ ok: true, results })
}
