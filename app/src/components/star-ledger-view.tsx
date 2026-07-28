// Shared visual for the Star Ledger — used by both /stars (real data) and
// /demo/stars (mock data). Pure presentational, no auth.

import type { DemoLedgerEntry } from '@/lib/demo-data'
import { RowActions } from '@/components/row-actions'
import { TIER_NAMES, TIER_THRESHOLDS } from '@/lib/demo-data'

const REASON_EMOJI: Record<string, string> = {
  skill_milestone: '🎯',
  discipline: '🧘',
  attendance: '📅',
  google_review: '⭐',
  social_tag: '📣',
  referral: '🤝',
  showcase: '⭐',
  other: '✨',
}

const REASON_LABEL: Record<string, string> = {
  skill_milestone: 'Skill milestone',
  discipline: 'Discipline',
  attendance: 'Attendance',
  google_review: 'Google review',
  social_tag: 'Social tag',
  referral: 'Referral',
  showcase: 'Showcase',
  other: 'Other',
}

export function StarLedgerView({
  weekTotalStars,
  weekTotalAwards,
  topStudent,
  entries,
  tierCounts,
  withActions = false,
}: {
  weekTotalStars: number
  weekTotalAwards: number
  topStudent: { name: string; stars: number } | null
  entries: DemoLedgerEntry[]
  tierCounts: number[] // length 6: index 0 unused; 1..5 = count of students per tier
  withActions?: boolean
}) {
  return (
    <div className="space-y-8">
      {/* KPI row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Kpi icon="⭐" label="Stars this week"    value={weekTotalStars}   accent="from-amber-500 to-amber-600" />
        <Kpi icon="🎯" label="Awards this week"   value={weekTotalAwards}  accent="from-blue-500 to-blue-700" />
        <Kpi icon="🏆" label="Top student"         valueText={topStudent ? topStudent.name : '—'} valueSub={topStudent ? `${topStudent.stars} stars` : 'No awards yet'} accent="from-[#D72027] to-[#A0151B]" />
        <Kpi icon="📊" label="BigStar Trainees"    value={tierCounts[5] ?? 0} accent="from-emerald-500 to-emerald-700" />
      </section>

      {/* Tier ladder */}
      <section>
        <h2 className="text-lg font-extrabold text-zinc-900 mb-3">Tier ladder</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((tier) => (
            <div
              key={tier}
              className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4 text-center"
            >
              <div className="text-2xl mb-1">{'⭐'.repeat(tier)}</div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-1">
                Tier {tier}
              </div>
              <div className="text-sm font-extrabold text-zinc-900">{TIER_NAMES[tier]}</div>
              <div className="text-[10px] text-zinc-500 mt-1">
                {TIER_THRESHOLDS[tier]}{tier < 5 ? `–${(TIER_THRESHOLDS[tier + 1] ?? 999) - 1}` : '+'} stars
              </div>
              <div className="mt-3 text-xs">
                <span className="bg-zinc-100 px-2 py-0.5 rounded font-extrabold text-zinc-700">
                  {tierCounts[tier] ?? 0} students
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="text-lg font-extrabold text-zinc-900">Recent activity</h2>
          <span className="text-xs text-zinc-500">Latest {entries.length}</span>
        </div>
        {entries.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-10 text-center text-zinc-500">
            <div className="text-4xl mb-2">📒</div>
            <p className="font-bold text-zinc-700">No stars awarded yet.</p>
            <p className="text-sm mt-1">Open Roll Call and tap the ⭐ on a student tile.</p>
          </div>
        ) : (
          <ul className="bg-white rounded-2xl shadow-sm border border-zinc-200 divide-y divide-zinc-100">
            {entries.map((e) => (
              <li key={e.id} className="flex items-start gap-4 px-5 py-4">
                <div className="text-2xl">{REASON_EMOJI[e.reason] || '✨'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-extrabold text-zinc-900">{e.student}</span>
                    <span className="text-amber-700 font-extrabold">+{e.stars} ⭐</span>
                    <span className="text-xs text-zinc-400">·</span>
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      {REASON_LABEL[e.reason] || e.reason}
                    </span>
                  </div>
                  {e.notes && <p className="text-sm text-zinc-600 mt-0.5">{e.notes}</p>}
                  <div className="text-xs text-zinc-400 mt-1">
                    {formatDate(e.date)} · Coach {e.coach}
                  </div>
                </div>
                {withActions && e.stars > 0 && (
                  <RowActions
                    className="shrink-0"
                    deleteUrl={`/api/stars?id=${e.id}`}
                    confirmText={`Undo ${e.stars} star${e.stars > 1 ? 's' : ''} for ${e.student}? Their total goes back down.`}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Kpi({
  icon, label, value, valueText, valueSub, accent,
}: {
  icon: string
  label: string
  value?: number
  valueText?: string
  valueSub?: string
  accent: string
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4 sm:p-5 relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} aria-hidden />
      <div className="flex items-start gap-3">
        <span className="text-2xl sm:text-3xl">{icon}</span>
        <div className="min-w-0">
          <div className="text-xl sm:text-2xl font-extrabold text-zinc-900 leading-tight truncate">
            {value !== undefined ? value : valueText ?? '—'}
          </div>
          {valueSub && <div className="text-xs text-zinc-500 truncate">{valueSub}</div>}
          <div className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-500 font-bold mt-1">
            {label}
          </div>
        </div>
      </div>
    </div>
  )
}
