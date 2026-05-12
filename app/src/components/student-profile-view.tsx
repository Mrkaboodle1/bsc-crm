import { TIER_NAMES, TIER_THRESHOLDS } from '@/lib/demo-data'

export type StudentProfile = {
  id: string
  firstName: string
  lastName: string | null
  age: number | null
  dob: string | null
  medical: string | null
  photoConsent: boolean
  photoConsentDate: string | null
  blueCardNumber: string | null
  blueCardExpiry: string | null
  totalStars: number
  starTier: number
  traineeStatus: string
  family: {
    id: string
    name: string
    parent: string | null
    email: string | null
    phone: string | null
    lifecycle: string | null
  } | null
  ledger: Array<{
    id: string
    stars: number
    reason: string
    notes: string | null
    awardedAt: string
    coachName: string | null
  }>
  enrolments: Array<{
    id: string
    startDate: string
    endDate: string | null
    status: string
    weeklyFee: number | null
    term: string | null
    className: string
    classId: string | null
    discipline: string | null
  }>
  attendance: Array<{
    id: string
    date: string
    status: string
    stars: number
    notes: string | null
    className: string
  }>
}

const REASON_EMOJI: Record<string, string> = {
  skill_milestone: '🎯', discipline: '🧘', attendance: '📅',
  google_review: '⭐', social_tag: '📣', referral: '🤝',
  showcase: '⭐', other: '✨',
}

const STATUS_EMOJI: Record<string, string> = {
  present: '✅', late: '⏰', absent: '❌', makeup: '🔁', excused: '🛌',
}

export function StudentProfileView({ profile }: { profile: StudentProfile }) {
  const nextTier = profile.starTier < 5 ? profile.starTier + 1 : null
  const starsToNext = nextTier ? Math.max(0, (TIER_THRESHOLDS[nextTier] ?? 0) - profile.totalStars) : 0
  const tierProgress = nextTier
    ? Math.min(100, ((profile.totalStars - (TIER_THRESHOLDS[profile.starTier] ?? 0)) /
        ((TIER_THRESHOLDS[nextTier] ?? 1) - (TIER_THRESHOLDS[profile.starTier] ?? 0))) * 100)
    : 100

  const activeEnrolments = profile.enrolments.filter((e) => e.status === 'active')

  const presentCount = profile.attendance.filter((a) => a.status === 'present' || a.status === 'late').length
  const absentCount = profile.attendance.filter((a) => a.status === 'absent').length
  const attendanceRate = profile.attendance.length > 0
    ? Math.round((presentCount / profile.attendance.length) * 100)
    : null

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Left column — overview + tier progression */}
      <div className="xl:col-span-1 space-y-6">
        {/* Identity card */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#D72027] to-[#FFC107] text-white flex items-center justify-center text-3xl font-extrabold mb-3">
            {(profile.firstName[0] || '?') + (profile.lastName?.[0] ?? '')}
          </div>
          <h2 className="text-2xl font-extrabold text-zinc-900">
            {profile.firstName} {profile.lastName ?? ''}
          </h2>
          {profile.age !== null && (
            <p className="text-sm text-zinc-500 mt-1">{profile.age} years old</p>
          )}
          {profile.family && (
            <a
              href={`/families/${profile.family.id}`}
              className="inline-block mt-3 text-sm font-bold text-[#D72027] hover:underline"
            >
              {profile.family.name} family →
            </a>
          )}
          {profile.medical && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl px-3 py-2 text-left">
              <strong>⚕ Medical:</strong> {profile.medical}
            </div>
          )}
        </div>

        {/* Tier ladder */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
          <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-3">
            Star tier
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl">{'⭐'.repeat(profile.starTier)}</span>
            <span className="text-2xl font-extrabold text-zinc-900">
              {TIER_NAMES[profile.starTier]}
            </span>
          </div>
          <div className="text-sm text-zinc-600 mb-3">
            <strong className="text-zinc-900">{profile.totalStars}</strong> stars total
            {nextTier && (
              <> · {starsToNext} more to <strong>{TIER_NAMES[nextTier]}</strong></>
            )}
          </div>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all"
              style={{ width: `${tierProgress}%` }}
              aria-hidden
            />
          </div>
          {profile.starTier === 5 && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-900 font-bold">
              🏆 BigStar Trainee — invite to the Trainee Show Programme.
            </div>
          )}
        </div>

        {/* Compliance card */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
          <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-3">
            Compliance
          </div>
          <dl className="space-y-2 text-sm">
            <Row label="Photo consent" value={profile.photoConsent ? `✅ Granted${profile.photoConsentDate ? ` (${profile.photoConsentDate})` : ''}` : '❌ Not granted'} />
            <Row label="Blue card" value={profile.blueCardNumber ? `${profile.blueCardNumber}${profile.blueCardExpiry ? ` · expires ${profile.blueCardExpiry}` : ''}` : profile.age !== null && profile.age >= 14 ? '⚠ Required (14+)' : '— Not required'} />
            <Row label="Trainee status" value={profile.traineeStatus.replace('_', ' ')} />
          </dl>
        </div>

        {/* Family contact */}
        {profile.family && (
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
            <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-3">
              Family contact
            </div>
            <dl className="space-y-2 text-sm">
              {profile.family.parent && <Row label="Parent" value={profile.family.parent} />}
              {profile.family.email && <Row label="Email" value={profile.family.email} />}
              {profile.family.phone && <Row label="Phone" value={profile.family.phone} />}
              {profile.family.lifecycle && (
                <Row
                  label="Lifecycle"
                  valueNode={
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded">
                      {profile.family.lifecycle}
                    </span>
                  }
                />
              )}
            </dl>
          </div>
        )}
      </div>

      {/* Right column — enrolments, attendance, ledger */}
      <div className="xl:col-span-2 space-y-6">
        {/* Attendance summary */}
        <section className="grid grid-cols-3 gap-3">
          <Stat icon="📅" label="Attended" value={presentCount} />
          <Stat icon="❌" label="Absent" value={absentCount} />
          <Stat icon="📊" label="Rate" value={attendanceRate !== null ? `${attendanceRate}%` : '—'} />
        </section>

        {/* Current enrolments */}
        <section>
          <h3 className="text-lg font-extrabold text-zinc-900 mb-3">
            Current enrolments ({activeEnrolments.length})
          </h3>
          {activeEnrolments.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 text-center text-sm text-zinc-500">
              Not currently enrolled in any class.
            </div>
          ) : (
            <ul className="bg-white rounded-2xl shadow-sm border border-zinc-200 divide-y divide-zinc-100">
              {activeEnrolments.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-2xl">🎪</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-zinc-900 truncate">{e.className}</div>
                    <div className="text-xs text-zinc-500">
                      {e.term ?? ''} · ${e.weeklyFee ?? 0}/wk · since {e.startDate}
                    </div>
                  </div>
                  {e.classId && (
                    <a
                      href={`/roll-call/${e.classId}`}
                      className="text-xs font-bold text-[#D72027] hover:underline shrink-0"
                    >
                      Roll Call →
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Star timeline */}
        <section>
          <h3 className="text-lg font-extrabold text-zinc-900 mb-3">
            Stars earned ({profile.ledger.length})
          </h3>
          {profile.ledger.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 text-center text-sm text-zinc-500">
              No stars awarded yet. Open Roll Call and tap the ⭐ on this student&apos;s tile.
            </div>
          ) : (
            <ul className="bg-white rounded-2xl shadow-sm border border-zinc-200 divide-y divide-zinc-100">
              {profile.ledger.map((l) => (
                <li key={l.id} className="flex items-start gap-4 px-5 py-3">
                  <div className="text-2xl">{REASON_EMOJI[l.reason] || '✨'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-extrabold text-amber-700">+{l.stars} ⭐</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        {l.reason.replace('_', ' ')}
                      </span>
                    </div>
                    {l.notes && <p className="text-sm text-zinc-700 mt-0.5">{l.notes}</p>}
                    <div className="text-xs text-zinc-400 mt-1">
                      {formatDateTime(l.awardedAt)}
                      {l.coachName && ` · Coach ${l.coachName}`}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Attendance history */}
        <section>
          <h3 className="text-lg font-extrabold text-zinc-900 mb-3">
            Attendance history
          </h3>
          {profile.attendance.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 text-center text-sm text-zinc-500">
              No attendance recorded yet.
            </div>
          ) : (
            <ul className="bg-white rounded-2xl shadow-sm border border-zinc-200 divide-y divide-zinc-100">
              {profile.attendance.slice(0, 12).map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <span className="text-xl shrink-0">{STATUS_EMOJI[a.status] || '·'}</span>
                  <span className="font-bold text-zinc-700 w-24 shrink-0 capitalize">{a.status}</span>
                  <span className="flex-1 min-w-0 truncate text-zinc-700">{a.className}</span>
                  {a.stars > 0 && (
                    <span className="bg-amber-100 text-amber-800 text-xs font-extrabold px-2 py-0.5 rounded shrink-0">
                      +{a.stars}⭐
                    </span>
                  )}
                  <span className="text-xs text-zinc-400 shrink-0">{a.date}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function Row({
  label, value, valueNode,
}: { label: string; value?: string; valueNode?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs uppercase tracking-wider font-bold text-zinc-500">{label}</dt>
      <dd className="text-zinc-900 text-right text-sm font-bold truncate">
        {valueNode ?? value}
      </dd>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: string; label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-extrabold text-zinc-900 leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mt-1">{label}</div>
    </div>
  )
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}
