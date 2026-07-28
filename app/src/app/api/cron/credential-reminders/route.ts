import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'

export const runtime = 'nodejs'

// GET /api/cron/credential-reminders — daily. Emails a coach 14 days before any
// of their credentials expires, once per credential. Secured by CRON_SECRET.

const WARN_DAYS = 14
const LABEL: Record<string, string> = {
  blue_card: 'Blue Card', first_aid: 'First Aid certificate', public_liability: 'Public Liability Insurance',
  drivers_licence: "Driver's Licence", gymnastics: 'coaching accreditation', other: 'certificate',
}

function bneToday(): string {
  const bne = new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Brisbane' }))
  return bne.toISOString().slice(0, 10)
}
function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const url = new URL(req.url)
  if (secret) {
    const auth = req.headers.get('authorization') || ''
    if (auth !== `Bearer ${secret}` && url.searchParams.get('key') !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const admin = createAdminSupabase()
  const today = bneToday()
  const horizon = addDays(today, WARN_DAYS)

  // Credentials expiring within the window that we haven't reminded about yet
  const { data: docs } = await admin
    .from('coach_documents')
    .select('id, coach_id, doc_type, label, expiry_on, coach:coaches(full_name, email)')
    .not('expiry_on', 'is', null)
    .lte('expiry_on', horizon)
    .gte('expiry_on', today)
    .is('reminder_sent_on', null)

  let sent = 0
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://app-chi-silk-29.vercel.app'
  for (const d of docs ?? []) {
    const rawCoach = (d as unknown as { coach: { full_name: string; email: string } | { full_name: string; email: string }[] }).coach
    const coach = Array.isArray(rawCoach) ? rawCoach[0] : rawCoach
    if (!coach?.email) continue
    const name = (coach.full_name || 'there').split(' ')[0]
    const what = d.doc_type === 'other' ? (d.label || 'certificate') : (LABEL[d.doc_type] || 'credential')
    const when = new Date(String(d.expiry_on) + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    const html = `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#222;line-height:1.55"><p>Hi ${name}! 🎪</p><p>Just a friendly heads-up from <strong>BigStar Circus</strong> — your <strong>${what}</strong> is due to expire on <strong>${when}</strong>.</p><p>When you&apos;ve renewed it, please upload the new one here so we can keep your file up to date:</p><p><a href="${base}/credentials" style="background:#D72027;color:#fff;font-weight:bold;padding:10px 18px;border-radius:8px;text-decoration:none">Upload my renewed ${what}</a></p><p>Thanks for keeping everything current — it keeps our kids safe and our studio compliant. 🌟</p><p>BigStar Circus</p></div>`
    try {
      const r = await sendEmail(coach.email, `⏰ Your ${what} expires soon — BigStar Circus`, html, 'credential-reminder')
      if (r.ok) { await admin.from('coach_documents').update({ reminder_sent_on: today }).eq('id', d.id); sent++ }
    } catch { /* skip */ }
  }

  return NextResponse.json({ ok: true, checked: docs?.length ?? 0, sent })
}
