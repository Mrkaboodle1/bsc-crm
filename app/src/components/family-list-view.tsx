// Shared list view for /families and /demo/families.

export type FamilyRow = {
  id: string
  name: string
  primaryParent: string | null
  email: string | null
  phone: string | null
  lifecycle: string | null
  source: string | null
  weeklyFee: number | null
  studentCount: number
  tags: string[]
}

const LIFECYCLE_CLS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  trial: 'bg-blue-100 text-blue-800',
  lead: 'bg-amber-100 text-amber-800',
  paused: 'bg-zinc-100 text-zinc-600',
  past: 'bg-zinc-100 text-zinc-500',
  lost: 'bg-red-50 text-red-700',
}

export function FamilyListView({
  rows,
  q,
  stage,
  hrefPrefix = '/families',
}: {
  rows: FamilyRow[]
  q: string
  stage: string
  hrefPrefix?: string
}) {
  return (
    <div className="space-y-4">
      <form className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-3 flex items-center gap-2 flex-wrap">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search family or parent…"
          className="flex-1 min-w-[180px] px-4 py-2.5 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none"
        />
        <select
          name="stage"
          defaultValue={stage}
          className="px-4 py-2.5 border-2 border-zinc-200 rounded-xl text-sm font-bold focus:border-[#D72027] focus:outline-none"
        >
          <option value="">All lifecycle</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="lead">Lead</option>
          <option value="paused">Paused</option>
          <option value="past">Past</option>
          <option value="lost">Lost</option>
        </select>
        <button type="submit" className="bg-zinc-900 text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-zinc-800">
          Filter
        </button>
        {(q || stage) && (
          <a href={hrefPrefix} className="text-sm font-bold text-zinc-500 hover:text-zinc-900 px-3 py-2.5">
            Clear
          </a>
        )}
      </form>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-10 text-center text-zinc-500">
          <div className="text-4xl mb-2">👨‍👩‍👧</div>
          <p className="font-bold text-zinc-700">No families match.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-left text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                <th className="px-4 sm:px-5 py-3">Family</th>
                <th className="px-4 py-3 hidden md:table-cell">Contact</th>
                <th className="px-4 py-3 hidden lg:table-cell">Source</th>
                <th className="px-4 py-3 hidden sm:table-cell">Lifecycle</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Kids</th>
                <th className="px-4 py-3 text-right">Weekly</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((f) => (
                <tr key={f.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 sm:px-5 py-3">
                    <a href={`${hrefPrefix}/${f.id}`} className="flex items-center gap-3 group">
                      <span className="w-9 h-9 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center text-xs font-extrabold shrink-0">
                        {f.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="font-extrabold text-zinc-900 group-hover:underline truncate">
                          {f.name}
                        </div>
                        {f.primaryParent && (
                          <div className="text-[11px] text-zinc-500 truncate">{f.primaryParent}</div>
                        )}
                      </div>
                    </a>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-zinc-600 text-xs">
                    {f.email && <div className="truncate max-w-[200px]">{f.email}</div>}
                    {f.phone && <div className="text-zinc-400">{f.phone}</div>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-zinc-500 text-xs">
                    {f.source ?? '—'}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {f.lifecycle && (
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${LIFECYCLE_CLS[f.lifecycle] ?? 'bg-zinc-100 text-zinc-500'}`}>
                        {f.lifecycle}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-700 hidden sm:table-cell">{f.studentCount}</td>
                  <td className="px-4 py-3 text-right font-extrabold text-zinc-900">
                    {f.weeklyFee !== null && f.weeklyFee > 0 ? `$${f.weeklyFee.toFixed(0)}` : '—'}
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
