import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

// GET /api/cron/enrolment-expiry — daily, 2am Brisbane. Any enrolment given a
// future end_date ("finishing at end of term") is flipped to cancelled once
// that date has passed, so families drop off the rolls automatically on the
// day they were promised to. Leaves an owner_alert so the change is visible.
// Secured by CRON_SECRET.

function bneToday(): string {
  const bne = new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Brisbane' }))
  return bne.toISOString().slice(0, 10)
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

  const { data: due, error } = await admin
    .from('enrolments')
    .select('id, tenant_id, end_date, student:students(first_name, last_name), class:classes(name)')
    .lt('end_date', today)
    .in('status', ['active', 'paused'])
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  if (!due?.length) return NextResponse.json({ ok: true, expired: 0 })

  const ids = due.map((e) => e.id)
  const { error: upErr } = await admin.from('enrolments').update({ status: 'cancelled' }).in('id', ids)
  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 })

  // One dashboard alert per run, listing who came off which roll.
  const one = <T,>(v: T[] | T | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v)
  const lines = due.map((e) => {
    const s = one(e.student)
    const c = one(e.class)
    return `${s?.first_name ?? '?'} ${s?.last_name ?? ''} — ${c?.name ?? '?'} (ended ${e.end_date})`
  })
  await admin.from('owner_alerts').insert({
    tenant_id: due[0]!.tenant_id,
    kind: 'enrolment_expiry',
    title: `${due.length} enrolment${due.length === 1 ? '' : 's'} finished as scheduled`,
    body: lines.join('\n'),
    source: 'cron/enrolment-expiry',
  })

  return NextResponse.json({ ok: true, expired: due.length, lines })
}
