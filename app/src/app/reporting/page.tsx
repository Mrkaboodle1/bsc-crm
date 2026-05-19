import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import {
  TERM_DATES,
  type Term,
  currentTerm,
  getTerm,
  brisbaneToday,
  termWeekDates,
  termsForYear,
} from '@/lib/term-dates'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type ClassRow = {
  id: string
  name: string
  day_of_week: number
  start_time: string
  capacity: number
}

export default async function ReportingPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string; year?: string }>
}) {
  const sp = await searchParams
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const todayIso = brisbaneToday()
  const fallback = currentTerm(todayIso)
  const requestedTerm = sp.term ? (parseInt(sp.term, 10) as Term) : fallback.term
  const requestedYear = sp.year ? parseInt(sp.year, 10) : fallback.year
  const termRange = getTerm(requestedYear, requestedTerm) ?? fallback

  // All active classes
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name, day_of_week, start_time, capacity')
    .eq('tenant_id', user.tenantId)
    .eq('status', 'active')
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })
    .returns<ClassRow[]>()

  const classIds = (classes ?? []).map((c) => c.id)

  // Enrolment counts per class
  const { data: enrols } = await supabase
    .from('enrolments')
    .select('class_id, student_id')
    .eq('tenant_id', user.tenantId)
    .eq('status', 'active')
    .in('class_id', classIds.length ? classIds : ['00000000-0000-0000-0000-000000000000'])
  const enrolByClass = (enrols ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.class_id] = (acc[r.class_id] ?? 0) + 1
    return acc
  }, {})

  // Attendance for the chosen term (across all weeks)
  // We pull ALL attendance for the term and tally locally — simpler than 11 queries.
  const termStart = termRange.start
  const termEnd = termRange.end
  const { data: attendance } = await supabase
    .from('attendance')
    .select('class_id, status, date')
    .eq('tenant_id', user.tenantId)
    .gte('date', termStart)
    .lte('date', termEnd)

  // Tally per class
  type Tally = { present: number; late: number; absent: number; makeup: number; total: number }
  const tallyByClass: Record<string, Tally> = {}
  for (const a of attendance ?? []) {
    const t = tallyByClass[a.class_id] ?? (tallyByClass[a.class_id] = { present: 0, late: 0, absent: 0, makeup: 0, total: 0 })
    t.total++
    if (a.status === 'present') t.present++
    else if (a.status === 'late') t.late++
    else if (a.status === 'absent') t.absent++
    else if (a.status === 'makeup') t.makeup++
  }

  // Overall totals
  const totals: Tally = { present: 0, late: 0, absent: 0, makeup: 0, total: 0 }
  for (const t of Object.values(tallyByClass)) {
    totals.present += t.present
    totals.late += t.late
    totals.absent += t.absent
    totals.makeup += t.makeup
    totals.total += t.total
  }
  const attendanceRate = totals.total > 0 ? Math.round(((totals.present + totals.late + totals.makeup) / totals.total) * 100) : 0
  const totalEnrolled = Object.values(enrolByClass).reduce((a, b) => a + b, 0)
  // Expected sessions = enrolment × weeks (rough — assumes weekly classes)
  const weeksInTerm = termWeekDates(termRange, 1).length

  const allYears = Array.from(new Set(TERM_DATES.map((t) => t.year))).sort()
  const termsThisYear = termsForYear(termRange.year)

  return (
    <DashboardShell
      user={user}
      currentPath="/reporting"
      pageTitle="Attendance reports"
      pageSubtitle={`Term ${termRange.term} ${termRange.year} · ${weeksInTerm} weeks`}
    >
      {/* Term + year picker */}
      <div className="bg-white rounded-xl border border-zinc-200 p-3 mb-5 flex items-center gap-3 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Year</span>
        <div className="flex gap-1">
          {allYears.map((y) => (
            <a
              key={y}
              href={`/reporting?year=${y}&term=${termRange.term}`}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                y === termRange.year
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              {y}
            </a>
          ))}
        </div>
        <span className="text-zinc-300 mx-1">·</span>
        <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Term</span>
        <div className="flex gap-1">
          {termsThisYear.map((t) => (
            <a
              key={t.term}
              href={`/reporting?year=${t.year}&term=${t.term}`}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                t.term === termRange.term
                  ? 'bg-[#D72027] text-white'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              T{t.term}
            </a>
          ))}
        </div>
        <span className="ml-auto text-xs text-zinc-500">
          {termRange.start} → {termRange.end}
        </span>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KpiCard label="Active classes" value={classes?.length ?? 0} sub="Mon → Sat" />
        <KpiCard label="Enrolled spots" value={totalEnrolled} sub="across all classes" />
        <KpiCard label="Sessions logged" value={totals.total} sub={`out of ~${totalEnrolled * weeksInTerm}`} />
        <KpiCard label="Attendance rate" value={`${attendanceRate}%`} sub="present + late + makeup" accent={attendanceRate >= 80 ? 'good' : attendanceRate >= 60 ? 'warn' : 'bad'} />
        <KpiCard label="Absences" value={totals.absent} sub="across the term" accent={totals.absent > 50 ? 'warn' : undefined} />
      </div>

      {/* Per-class breakdown */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Per-class attendance — Term {termRange.term} {termRange.year}</h2>
          <span className="text-xs text-zinc-500">{classes?.length ?? 0} classes</span>
        </div>
        {!classes || classes.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500">No active classes.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3 hidden md:table-cell">Enrolled</th>
                <th className="px-4 py-3 text-emerald-700">Present</th>
                <th className="px-4 py-3 text-amber-700">Late</th>
                <th className="px-4 py-3 text-blue-700">Make-up</th>
                <th className="px-4 py-3 text-red-700">Absent</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {classes.map((c) => {
                const t = tallyByClass[c.id] ?? { present: 0, late: 0, absent: 0, makeup: 0, total: 0 }
                const rate = t.total > 0 ? Math.round(((t.present + t.late + t.makeup) / t.total) * 100) : null
                return (
                  <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <a href={`/roll-call/${c.id}?term=${termRange.term}&year=${termRange.year}`} className="font-semibold text-zinc-900 hover:text-[#D72027]">
                        {c.name}
                      </a>
                      <div className="text-[11px] text-zinc-500">{DAY_NAMES[c.day_of_week]} {c.start_time.slice(0, 5)}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 hidden md:table-cell tabular-nums">
                      {enrolByClass[c.id] ?? 0}<span className="text-zinc-300"> / {c.capacity}</span>
                    </td>
                    <td className="px-4 py-3 text-emerald-700 font-semibold tabular-nums">{t.present || '—'}</td>
                    <td className="px-4 py-3 text-amber-700 font-semibold tabular-nums">{t.late || '—'}</td>
                    <td className="px-4 py-3 text-blue-700 font-semibold tabular-nums">{t.makeup || '—'}</td>
                    <td className="px-4 py-3 text-red-700 font-semibold tabular-nums">{t.absent || '—'}</td>
                    <td className="px-4 py-3">
                      {rate === null ? (
                        <span className="text-zinc-300 text-xs">—</span>
                      ) : (
                        <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          rate >= 80
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
                            : rate >= 60
                              ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'
                              : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200'
                        }`}>
                          {rate}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a href={`/roll-call/${c.id}?term=${termRange.term}&year=${termRange.year}`} className="text-xs font-semibold text-[#D72027] hover:underline">
                        Open roll →
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {totals.total === 0 && (classes?.length ?? 0) > 0 && (
        <div className="mt-6 bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-4 py-3 text-sm text-amber-900">
          <strong>No attendance recorded for this term yet.</strong>{' '}
          Open any class on /roll-call and start tapping cells — every tap is saved
          to the database and rolls up here automatically.
        </div>
      )}
    </DashboardShell>
  )
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: number | string
  sub?: string
  accent?: 'good' | 'warn' | 'bad'
}) {
  const ring =
    accent === 'good'
      ? 'ring-emerald-200'
      : accent === 'warn'
        ? 'ring-amber-200'
        : accent === 'bad'
          ? 'ring-red-200'
          : 'ring-transparent'
  return (
    <div className={`bg-white rounded-xl border border-zinc-200 p-4 ring-2 ${ring}`}>
      <div className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-1.5">{label}</div>
      <div className="text-2xl font-bold text-zinc-900 leading-none tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-zinc-500 mt-1.5">{sub}</div>}
    </div>
  )
}
