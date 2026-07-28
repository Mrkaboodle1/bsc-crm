import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { getCeoDashboard } from '@/lib/ceo-dashboard'

export const runtime = 'nodejs'
export const maxDuration = 60

// GET /api/cron/kpi-snapshot — every Monday. Freezes this week's numbers so the
// CEO dashboard can chart the climb to 650 instead of only ever showing "now".
// Secured by CRON_SECRET.
const TENANT = process.env.BSC_TENANT_ID || '33c7b22a-52c6-444e-9057-d03d5ed3d94e'

function mondayISO(): string {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Brisbane' }))
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') || ''
    const url = new URL(req.url)
    if (auth !== `Bearer ${secret}` && url.searchParams.get('key') !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const admin = createAdminSupabase()
  const d = await getCeoDashboard()
  const week_start = mondayISO()

  const row = {
    tenant_id: TENANT, week_start,
    students: d.students.active,
    weekly_revenue: d.revenue.weekly,
    joined: d.growth.joined,
    cancelled: d.growth.cancelled,
    attended: d.attendance.thisWeek,
    trials: d.trials.onRoll,
    satellites: d.satellites.open,
    metrics: {
      retentionPct: d.retention.pct,
      annualised: d.revenue.annualised,
      pctToStudentGoal: d.students.pct,
      pctToRevenueGoal: d.revenue.pct,
      stadiumFund: d.stadiumFund.total,
      coaches: d.team.coaches,
      radarSuburbs: d.radar.length,
    },
  }

  const { error } = await admin.from('kpi_snapshots').upsert(row, { onConflict: 'tenant_id,week_start' })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, week_start, students: row.students, weekly_revenue: row.weekly_revenue })
}
