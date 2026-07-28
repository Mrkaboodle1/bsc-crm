// ----------------------------------------------------------------------------
// StarBand safety helpers used by the check-in / check-out routes:
//   • autoMarkRoll      — writes the Roll Call (attendance) automatically when
//                         a child taps in, matching their enrolled class on now.
//   • notifyParentOnCheck — texts the parent that their child is safely
//                         checked in / collected (gated by the tenant's
//                         StarBand "auto_text" setting; never throws).
// Both are deliberately fail-soft: a problem here must never block the kiosk.
// ----------------------------------------------------------------------------

import type { createServerSupabaseAdmin } from '@/lib/supabase-server'
import { sendSms } from '@/lib/sms'

type Sb = Awaited<ReturnType<typeof createServerSupabaseAdmin>>

export type CheckStudent = {
  id: string
  tenant_id: string
  family_id: string | null
  first_name: string
  last_name?: string
}

// Current date/time in Brisbane (no DST), plus weekday + minutes-since-midnight.
export function brisbaneNow() {
  const now = new Date()
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Brisbane', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now) // YYYY-MM-DD
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Australia/Brisbane', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now) // HH:MM
  const pretty = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(now) // 3:42 pm
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay() // 0=Sun..6=Sat
  const minutes = parseInt(time.slice(0, 2), 10) * 60 + parseInt(time.slice(3, 5), 10)
  return { date, time, pretty, dow, minutes }
}

function startMinutes(t: string | null): number | null {
  if (!t) return null
  const [h, m] = t.split(':')
  const hh = parseInt(h, 10), mm = parseInt(m || '0', 10)
  if (Number.isNaN(hh)) return null
  return hh * 60 + mm
}

type EnrolRow = {
  id: string
  class_id: string
  start_date: string | null
  end_date: string | null
  status: string | null
  classes: {
    id: string; name: string; day_of_week: number
    start_time: string; duration_minutes: number | null; status: string | null
  } | null
}

// Find the student's class happening "now" and write a present attendance row.
// Returns the class name if a roll was marked, else null.
export async function autoMarkRoll(
  sb: Sb,
  student: CheckStudent,
  ctx = brisbaneNow(),
): Promise<{ marked: boolean; className: string | null }> {
  try {
    const { data } = await sb
      .from('enrolments')
      .select('id, class_id, start_date, end_date, status, classes(id, name, day_of_week, start_time, duration_minutes, status)')
      .eq('student_id', student.id)
      .eq('status', 'active')

    const rows = (data as EnrolRow[] | null) ?? []
    let best: { row: EnrolRow; start: number; diff: number } | null = null

    for (const row of rows) {
      const c = row.classes
      if (!c || c.status === 'cancelled') continue
      if (c.day_of_week !== ctx.dow) continue
      if (row.start_date && row.start_date > ctx.date) continue
      if (row.end_date && row.end_date < ctx.date) continue
      const start = startMinutes(c.start_time)
      if (start == null) continue
      const dur = c.duration_minutes || 60
      // Window: tapped up to 60 min before start, until 30 min after class ends.
      if (ctx.minutes < start - 60 || ctx.minutes > start + dur + 30) continue
      const diff = Math.abs(ctx.minutes - start)
      if (!best || diff < best.diff) best = { row, start, diff }
    }

    if (!best) return { marked: false, className: null }

    await sb.from('attendance').upsert(
      {
        tenant_id: student.tenant_id,
        student_id: student.id,
        class_id: best.row.class_id,
        enrolment_id: best.row.id,
        date: ctx.date,
        status: 'present',
        coach_notes: 'Auto-marked via StarBand check-in',
        marked_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,class_id,date' },
    )
    return { marked: true, className: best.row.classes?.name ?? null }
  } catch (err) {
    console.error('autoMarkRoll error', err)
    return { marked: false, className: null }
  }
}

async function getStarbandSettings(sb: Sb, tenantId: string) {
  const { data } = await sb.from('tenants').select('name, settings').eq('id', tenantId).maybeSingle()
  const settings = (data?.settings ?? {}) as { starband?: { auto_text?: boolean } }
  return {
    tenantName: (data?.name as string) || 'BigStar Circus',
    autoText: Boolean(settings.starband?.auto_text),
  }
}

// Text the parent on check-in / check-out. Gated by the tenant auto_text flag.
export async function notifyParentOnCheck(
  sb: Sb,
  opts: {
    student: CheckStudent
    action: 'in' | 'out'
    collectedBy?: string | null
    autoMarkedClass?: string | null
    pretty?: string
  },
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const { student, action } = opts
    const { tenantName, autoText } = await getStarbandSettings(sb, student.tenant_id)
    if (!autoText) return { sent: false, reason: 'disabled' }
    if (!student.family_id) return { sent: false, reason: 'no_family' }

    const { data: family } = await sb
      .from('families')
      .select('phone, emergency_phone')
      .eq('id', student.family_id)
      .maybeSingle()
    const phone = (family?.phone as string) || (family?.emergency_phone as string) || null
    if (!phone) return { sent: false, reason: 'no_phone' }

    const when = opts.pretty || brisbaneNow().pretty
    const first = student.first_name
    let body: string
    if (action === 'in') {
      const cls = opts.autoMarkedClass ? ` for ${opts.autoMarkedClass}` : ''
      body = `✅ ${first} has safely checked in at ${tenantName}${cls} at ${when}. We'll text you when they're collected. — ${tenantName}`
    } else {
      const by = opts.collectedBy ? ` by ${opts.collectedBy}` : ''
      body = `👋 ${first} has been safely collected from ${tenantName}${by} at ${when}. See you next time! ⭐`
    }

    const res = await sendSms(phone, body)
    return { sent: res.ok, reason: res.ok ? undefined : res.error }
  } catch (err) {
    console.error('notifyParentOnCheck error', err)
    return { sent: false, reason: (err as Error).message }
  }
}
