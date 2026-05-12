// Shared list view for /students and /demo/students. Pure presentational.

export type StudentRow = {
  id: string
  firstName: string
  lastName: string | null
  age: number | null
  familyId: string | null
  familyName: string | null
  lifecycle: string | null
  totalStars: number
  starTier: number
  traineeStatus: string
}

const LIFECYCLE_CLS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  trial: 'bg-blue-100 text-blue-800',
  lead: 'bg-amber-100 text-amber-800',
  paused: 'bg-zinc-100 text-zinc-600',
  past: 'bg-zinc-100 text-zinc-500',
  lost: 'bg-red-50 text-red-700',
}

export function StudentListView({
  rows,
  q,
  tier,
  hrefPrefix = '/students',
}: {
  rows: StudentRow[]
  q: string
  tier: string
  hrefPrefix?: string
}) {
  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <form className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-3 flex items-center gap-2 flex-wrap">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name…"
          className="flex-1 min-w-[180px] px-4 py-2.5 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none"
        />
        <select
          name="tier"
          defaultValue={tier}
          className="px-4 py-2.5 border-2 border-zinc-200 rounded-xl text-sm font-bold focus:border-[#D72027] focus:outline-none"
        >
          <option value="">All tiers</option>
          <option value="1">Tier 1 · Spark</option>
          <option value="2">Tier 2 · Shining</option>
          <option value="3">Tier 3 · Rising</option>
          <option value="4">Tier 4 · Star</option>
          <option value="5">Tier 5 · BigStar Trainee</option>
        </select>
        <button
          type="submit"
          className="bg-zinc-900 text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-zinc-800"
        >
          Filter
        </button>
        {(q || tier) && (
          <a
            href={hrefPrefix}
            className="text-sm font-bold text-zinc-500 hover:text-zinc-900 px-3 py-2.5"
          >
            Clear
          </a>
        )}
      </form>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-10 text-center text-zinc-500">
          <div className="text-4xl mb-2">🪑</div>
          <p className="font-bold text-zinc-700">No students match.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-left text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                <th className="px-4 sm:px-5 py-3">Student</th>
                <th className="px-4 py-3 hidden sm:table-cell">Age</th>
                <th className="px-4 py-3 hidden md:table-cell">Family</th>
                <th className="px-4 py-3 hidden lg:table-cell">Status</th>
                <th className="px-4 py-3 text-right">Stars</th>
                <th className="px-4 py-3 text-right">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 sm:px-5 py-3">
                    <a
                      href={`${hrefPrefix}/${s.id}`}
                      className="flex items-center gap-3 group"
                    >
                      <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D72027] to-[#FFC107] text-white flex items-center justify-center text-xs font-extrabold shrink-0">
                        {(s.firstName[0] || '?') + (s.lastName?.[0] ?? '')}
                      </span>
                      <div className="min-w-0">
                        <div className="font-extrabold text-zinc-900 group-hover:underline truncate">
                          {s.firstName} {s.lastName ?? ''}
                        </div>
                        <div className="text-[11px] text-zinc-500 sm:hidden truncate">
                          {s.age !== null ? `${s.age}y · ` : ''}
                          {s.familyName ?? 'No family'}
                        </div>
                      </div>
                    </a>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-zinc-600">
                    {s.age !== null ? `${s.age}y` : '—'}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {s.familyId ? (
                      <a
                        href={`/families/${s.familyId}`}
                        className="text-zinc-700 hover:text-[#D72027] hover:underline font-bold"
                      >
                        {s.familyName}
                      </a>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {s.lifecycle && (
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${LIFECYCLE_CLS[s.lifecycle] ?? 'bg-zinc-100 text-zinc-500'}`}>
                        {s.lifecycle}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-zinc-900">
                    {s.totalStars}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span title={`Tier ${s.starTier}`} className="text-base">
                      {'⭐'.repeat(s.starTier)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
