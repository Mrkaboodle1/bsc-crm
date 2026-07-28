// /api/cron/loyalty-milestones — runs daily. Detects any child who has newly
// reached an attendance milestone (from the roll) and emails the admin a digest.
// Coaches & admin also see them on the Reward Milestones page. Secured by CRON_SECRET.
import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { detectForStudent, MILESTONES, rewardFor } from '@/lib/loyalty'
import { SIGNATURE_TEXT } from '@/lib/email-signature'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const emojiFor = (m: number) => MILESTONES.find((x) => x.classes === m)?.emoji || '🎁'

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

  const admin = createAdminSupabase()
  const { data: tenant } = await admin.from('tenants').select('id').order('created_at').limit(1).maybeSingle()
  if (!tenant) return NextResponse.json({ ok: true, note: 'no tenant' })

  // Only students who've actually been marked off recently can have crossed a
  // milestone — checking all 600+ every night made this run for minutes and
  // time out. Narrow to recent attendance, then check them in parallel batches.
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
  const { data: recent } = await admin
    .from('attendance')
    .select('student_id')
    .eq('tenant_id', tenant.id)
    .gte('date', since)
    .in('status', ['present', 'late', 'makeup'])
  const ids = [...new Set((recent ?? []).map((r) => r.student_id))]
  for (let i = 0; i < ids.length; i += 20) {
    await Promise.all(ids.slice(i, i + 20).map((id) =>
      detectForStudent(admin, tenant.id, id).catch(() => null)
    ))
  }

  // Gather newly reached (not yet notified) and email a single digest.
  const { data: due } = await admin.from('reward_milestones')
    .select('id, student_id, milestone').eq('tenant_id', tenant.id).eq('status', 'reached').is('notified_at', null)
  if (!due || !due.length) return NextResponse.json({ ok: true, new: 0 })

  // Names only for the students in this digest (not the whole school).
  const { data: named } = await admin.from('students').select('id, first_name, last_name').in('id', [...new Set(due.map((d) => d.student_id))])
  const nameById = new Map((named ?? []).map((s) => [s.id, `${s.first_name} ${s.last_name ?? ''}`.trim()]))
  const lines = due.map((d) => `${emojiFor(d.milestone)} ${nameById.get(d.student_id) || 'A student'} reached ${d.milestone} classes → ${rewardFor(d.milestone)}`)

  const RESEND = process.env.RESEND_API_KEY
  const FROM = process.env.RESEND_FROM_EMAIL || 'admin@bigstarcircus.com.au'
  const FROM_NAME = process.env.RESEND_FROM_NAME || 'Big Star Circus'
  const ADMIN_TO = process.env.RESEND_REPLY_TO || process.env.RESEND_INBOUND_ADDRESS
  if (RESEND && ADMIN_TO) {
    const text = `🎁 ${due.length} reward milestone${due.length === 1 ? '' : 's'} reached:\n\n${lines.join('\n')}\n\nHand these out and tick them off on the Reward Milestones page in the CRM.\n\n${SIGNATURE_TEXT}`
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `${FROM_NAME} <${FROM}>`, to: ADMIN_TO, subject: `🎁 ${due.length} reward milestone${due.length === 1 ? '' : 's'} reached`, text }),
      })
    } catch { /* ignore */ }
  }

  await admin.from('reward_milestones').update({ notified_at: new Date().toISOString() }).in('id', due.map((d) => d.id))
  return NextResponse.json({ ok: true, new: due.length })
}
