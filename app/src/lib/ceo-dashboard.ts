import 'server-only'
import { createAdminSupabase } from './supabase-admin'

// THE CEO DASHBOARD — every number that tells Rhett whether BigStar is getting
// closer to Cbus Stadium. Computed live from the CRM, Stripe-synced
// subscriptions and the expansion radar.
//
// The ladder: 650 active students → ~$1M recurring → Australia's biggest
// circus school → the stadium show.

export type Targets = {
  target_year: number; students: number; revenue: number
  satellites: number; stadium_goal: number; youtube_subs: number; nps_target: number
}
// Rhett moved the goalposts on 28 Jul 2026: 650 students by END OF 2027 (not
// 2032) via ~5 satellite studios, first satellite opening Term 1 2027. The
// stadium show stays the long-game prize behind it.
export const DEFAULT_TARGETS: Targets = {
  target_year: 2027, students: 650, revenue: 1014000,
  satellites: 5, stadium_goal: 250000, youtube_subs: 100000, nps_target: 90,
}

export const MILESTONES = [
  { students: 250, label: 'HQ stable' },
  { students: 350, label: 'Satellite 1 live (T1 2027)' },
  { students: 450, label: 'Satellite 2 live' },
  { students: 550, label: 'Satellites 3–4 live' },
  { students: 650, label: '650 — goal hit' },
]

export type CeoDashboard = {
  targets: Targets
  students: { active: number; pct: number; milestone: string; nextAt: number | null }
  revenue: { weekly: number; annualised: number; pct: number }
  growth: { joined: number; cancelled: number; net: number; weeklyNet: number }
  retention: { pct: number; active: number; everStarted: number }
  trials: { onRoll: number; converted: number; conversionPct: number | null }
  attendance: { thisWeek: number; lastWeek: number; delta: number }
  value: { avgWeeklyFee: number; lifetimeValue: number }
  satellites: { open: number; launchReady: number; testing: number; researching: number; target: number }
  stadiumFund: { total: number; goal: number; pct: number; lastAdded: string | null }
  team: { coaches: number; credentialsExpiring: number }
  radar: { name: string; status: string; score: number | null }[]
  alerts: { level: 'good' | 'warn' | 'bad'; text: string }[]
  hasRadar: boolean
}

const TENANT = process.env.BSC_TENANT_ID || '33c7b22a-52c6-444e-9057-d03d5ed3d94e'
const iso = (d: Date) => d.toISOString().slice(0, 10)
const weekStart = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - offset * 7); return iso(d) }

export async function getCeoDashboard(): Promise<CeoDashboard> {
  const admin = createAdminSupabase()
  const d30 = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const d7 = new Date(Date.now() - 7 * 86_400_000).toISOString()

  const [tgtRes, enrRes, subRes, attRes, coachRes, fundRes, radarRes] = await Promise.all([
    admin.from('ceo_targets').select('*').eq('tenant_id', TENANT).maybeSingle(),
    admin.from('enrolments').select('student_id, notes, status').eq('status', 'active'),
    admin.from('subscriptions').select('weekly_amount, status, started_at, cancelled_at').eq('tenant_id', TENANT),
    admin.from('attendance').select('student_id, date').eq('status', 'present').gte('date', weekStart(1)),
    admin.from('coaches').select('id, blue_card_expiry, first_aid_expiry').eq('tenant_id', TENANT).neq('status', 'departed'),
    admin.from('stadium_fund').select('amount, added_on').eq('tenant_id', TENANT),
    admin.from('expansion_suburbs').select('name, status, score').eq('tenant_id', TENANT).order('score', { ascending: false, nullsFirst: false }).limit(12),
  ])

  const targets: Targets = (tgtRes.data as Targets) ?? DEFAULT_TARGETS
  const hasRadar = !radarRes.error

  // 1 — Active students
  const activeStudents = new Set((enrRes.data ?? []).map((e) => e.student_id)).size
  const pctStudents = Math.round((activeStudents / targets.students) * 100)
  const nextMilestone = MILESTONES.find((m) => m.students > activeStudents)
  const currentMilestone = [...MILESTONES].reverse().find((m) => activeStudents >= m.students)

  // 2 — Revenue
  const subs = subRes.data ?? []
  const activeSubs = subs.filter((s) => s.status === 'active')
  const weekly = activeSubs.reduce((n, s) => n + Number(s.weekly_amount || 0), 0)
  const annualised = weekly * 52

  // 3 — Net growth
  const joined30 = subs.filter((s) => s.started_at && s.started_at > d30).length
  const cancelled30 = subs.filter((s) => s.cancelled_at && s.cancelled_at > d30).length
  const joined7 = subs.filter((s) => s.started_at && s.started_at > d7).length
  const cancelled7 = subs.filter((s) => s.cancelled_at && s.cancelled_at > d7).length

  // 4 — Retention
  const everStarted = subs.length
  const retentionPct = everStarted ? Math.round((activeSubs.length / everStarted) * 100) : 0

  // 5 — Trials & conversion
  const trialsOnRoll = (enrRes.data ?? []).filter((e) => /free trial/i.test(e.notes || '')).length
  const conversionPct = trialsOnRoll + activeSubs.length > 0
    ? Math.round((activeSubs.length / (activeSubs.length + trialsOnRoll)) * 100) : null

  // 6 — Attendance this week vs last
  const thisWk = weekStart(0), lastWk = weekStart(1)
  const att = attRes.data ?? []
  const thisWeek = new Set(att.filter((a) => a.date >= thisWk).map((a) => a.student_id)).size
  const lastWeek = new Set(att.filter((a) => a.date >= lastWk && a.date < thisWk).map((a) => a.student_id)).size

  // 7 — Value
  const avgWeeklyFee = activeSubs.length ? weekly / activeSubs.length : 0
  const lifetimeValue = avgWeeklyFee * 52 * 2   // BigStar's own assumption: 2 years

  // 8 — Satellites (from the radar)
  const radarRows = radarRes.data ?? []
  const countBy = (s: string) => radarRows.filter((r) => r.status === s).length

  // 9 — Stadium fund
  const fund = fundRes.data ?? []
  const fundTotal = fund.reduce((n, f) => n + Number(f.amount || 0), 0)
  const lastAdded = fund.length ? fund.map((f) => f.added_on).sort().slice(-1)[0] ?? null : null

  // 10 — Team
  const coaches = coachRes.data ?? []
  const soon = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)
  const expiring = coaches.filter((c) =>
    (c.blue_card_expiry && c.blue_card_expiry <= soon) || (c.first_aid_expiry && c.first_aid_expiry <= soon)).length

  // Alerts — the honest read
  const alerts: CeoDashboard['alerts'] = []
  const net30 = joined30 - cancelled30
  if (net30 < 0) alerts.push({ level: 'bad', text: `Net student growth is ${net30} over the last 30 days — more leaving than joining. This is the number that decides whether 650 is reachable.` })
  else if (net30 === 0) alerts.push({ level: 'warn', text: 'Net student growth is flat this month.' })
  else alerts.push({ level: 'good', text: `Net +${net30} students in the last 30 days.` })
  if (retentionPct < 60) alerts.push({ level: 'warn', text: `Only ${retentionPct}% of everyone who ever subscribed is still active — retention is where the 650 will be won or lost.` })
  if (fundTotal === 0) alerts.push({ level: 'warn', text: 'The Stadium Fund is empty. Even $500 a month makes the dream tangible.' })
  if (expiring > 0) alerts.push({ level: 'warn', text: `${expiring} coach credential${expiring > 1 ? 's' : ''} expiring within 30 days.` })
  if (!hasRadar) alerts.push({ level: 'warn', text: 'BigStar Radar isn’t set up yet — paste schema/059_bigstar_radar.sql to switch it on.' })

  return {
    targets,
    students: { active: activeStudents, pct: pctStudents, milestone: currentMilestone?.label ?? 'Building to HQ stable', nextAt: nextMilestone?.students ?? null },
    revenue: { weekly: +weekly.toFixed(2), annualised: +annualised.toFixed(0), pct: Math.round((annualised / targets.revenue) * 100) },
    growth: { joined: joined30, cancelled: cancelled30, net: net30, weeklyNet: joined7 - cancelled7 },
    retention: { pct: retentionPct, active: activeSubs.length, everStarted },
    trials: { onRoll: trialsOnRoll, converted: activeSubs.length, conversionPct },
    attendance: { thisWeek, lastWeek, delta: thisWeek - lastWeek },
    value: { avgWeeklyFee: +avgWeeklyFee.toFixed(2), lifetimeValue: +lifetimeValue.toFixed(0) },
    satellites: { open: countBy('open'), launchReady: countBy('launch_ready'), testing: countBy('demand_test'), researching: countBy('research') + countBy('watch') + countBy('venue_search'), target: targets.satellites },
    stadiumFund: { total: +fundTotal.toFixed(2), goal: targets.stadium_goal, pct: targets.stadium_goal ? Math.round((fundTotal / targets.stadium_goal) * 100) : 0, lastAdded },
    team: { coaches: coaches.length, credentialsExpiring: expiring },
    radar: radarRows.map((r) => ({ name: r.name, status: r.status, score: r.score })),
    alerts,
    hasRadar,
  }
}
