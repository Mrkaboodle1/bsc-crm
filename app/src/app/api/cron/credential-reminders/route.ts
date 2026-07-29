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

  // ---- Play On voucher resubscribe digest — Fridays only ----------------
  // Every active voucher family whose term is ending (or ended) needs a paid
  // subscription set up for next term. Rhett gets the whole list in one email
  // so nobody quietly falls off the books between terms.
  let voucherDigest = 0
  const bne = new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Brisbane' }))
  if (bne.getDay() === 5) {
    const soon = addDays(today, 21)
    const { data: vouchers } = await admin
      .from('play_on_vouchers')
      .select('family_name, student_name, voucher_ref, term_end, status')
      .eq('status', 'active')
      .not('term_end', 'is', null)
      .lte('term_end', soon)
      .order('term_end')
    if (vouchers?.length) {
      const rows = vouchers.map((v) => {
        const overdue = String(v.term_end) < today
        return `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee"><strong>${v.family_name || '—'}</strong></td><td style="padding:6px 10px;border-bottom:1px solid #eee">${v.student_name || '—'}</td><td style="padding:6px 10px;border-bottom:1px solid #eee">${v.voucher_ref || '—'}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;color:${overdue ? '#c00' : '#222'}">${overdue ? 'ENDED ' : 'ends '}${new Date(String(v.term_end) + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</td></tr>`
      }).join('')
      const html = `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#222;line-height:1.5"><p>Morning! 🎟️</p><p>These <strong>Play On voucher families</strong> need a <strong>paid subscription for next term</strong> — each voucher only covers one term, so anyone still on this list when the new term starts is attending unpaid:</p><table style="border-collapse:collapse;font-size:14px"><tr><td style="padding:6px 10px;font-weight:bold">Family</td><td style="padding:6px 10px;font-weight:bold">Child</td><td style="padding:6px 10px;font-weight:bold">Voucher</td><td style="padding:6px 10px;font-weight:bold">Term</td></tr>${rows}</table><p style="margin-top:14px"><a href="${base}/finance/vouchers" style="background:#D72027;color:#fff;font-weight:bold;padding:10px 18px;border-radius:8px;text-decoration:none">Open the voucher tracker</a></p><p>Once a family is subscribed, mark their voucher <strong>Converted ✓</strong> and they drop off this list.</p><p>— Jacky</p></div>`
      const r = await sendEmail('admin@bigstarcircus.com.au', `🎟️ ${vouchers.length} voucher famil${vouchers.length === 1 ? 'y needs' : 'ies need'} next-term subscriptions`, html, 'voucher-resubscribe')
      if (r.ok) voucherDigest = vouchers.length
    }
  }

  return NextResponse.json({ ok: true, checked: docs?.length ?? 0, sent, voucherDigest })
}
