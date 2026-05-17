// Tectonic-style contacts list. Rows: avatar + name + parent · phone+email
// · source · last activity · payment status pill · tag pills.

export type PaymentStatus = 'subscribed' | 'trial' | 'lead' | 'not_paying' | 'unknown'

export type ContactRow = {
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
  paymentStatus: PaymentStatus
  hasStripe: boolean
  lastActivity: string | null
}

const LIFECYCLE_CLS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  trial: 'bg-blue-100 text-blue-800',
  lead: 'bg-amber-100 text-amber-800',
  paused: 'bg-zinc-100 text-zinc-600',
  past: 'bg-zinc-100 text-zinc-500',
  lost: 'bg-red-50 text-red-700',
}

const PAYMENT_STYLE: Record<PaymentStatus, { label: string; cls: string; icon: string }> = {
  subscribed: { label: 'Paying', cls: 'bg-emerald-100 text-emerald-900', icon: '💚' },
  trial:      { label: 'Trial',  cls: 'bg-blue-100 text-blue-900',       icon: '🆓' },
  lead:       { label: 'Lead',   cls: 'bg-amber-100 text-amber-900',     icon: '🎯' },
  not_paying: { label: 'Not paying', cls: 'bg-red-100 text-red-900',     icon: '⚠️' },
  unknown:    { label: '—',      cls: 'bg-zinc-100 text-zinc-500',       icon: '·' },
}

const SOURCE_LABEL: Record<string, string> = {
  fb_ad: '📘 Facebook',
  instagram: '📸 Instagram',
  google: '🔍 Google',
  word_of_mouth: '💬 Word of mouth',
  school: '🏫 School',
  walkin: '🚪 Walk-in',
  open_day: '🎪 Open day',
  email: '✉️ Email',
  other: '✨ Other',
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export function ContactsListView({
  rows,
  q,
  stage,
  tag,
  source,
  topTags,
}: {
  rows: ContactRow[]
  q: string
  stage: string
  tag: string
  source: string
  topTags: string[]
}) {
  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <form className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-3 flex items-center gap-2 flex-wrap">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name / email / phone…"
          className="flex-1 min-w-[180px] px-4 py-2.5 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none"
        />
        <select
          name="stage"
          defaultValue={stage}
          className="px-3 py-2.5 border-2 border-zinc-200 rounded-xl text-sm font-bold focus:border-[#D72027] focus:outline-none"
        >
          <option value="">All lifecycle</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="lead">Lead</option>
          <option value="paused">Paused</option>
          <option value="past">Past</option>
          <option value="lost">Lost</option>
        </select>
        <select
          name="source"
          defaultValue={source}
          className="px-3 py-2.5 border-2 border-zinc-200 rounded-xl text-sm font-bold focus:border-[#D72027] focus:outline-none"
        >
          <option value="">Any source</option>
          {Object.entries(SOURCE_LABEL).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
        {topTags.length > 0 && (
          <select
            name="tag"
            defaultValue={tag}
            className="px-3 py-2.5 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none"
          >
            <option value="">Any tag</option>
            {topTags.map((t) => (
              <option key={t} value={t}>#{t}</option>
            ))}
          </select>
        )}
        <button type="submit" className="bg-zinc-900 text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-zinc-800">
          Filter
        </button>
        {(q || stage || tag || source) && (
          <a href="/contacts" className="text-sm font-bold text-zinc-500 hover:text-zinc-900 px-3 py-2.5">
            Clear
          </a>
        )}
      </form>

      {/* List */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-10 text-center text-zinc-500">
          <div className="text-4xl mb-2">👤</div>
          <p className="font-bold text-zinc-700">No contacts match.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-left text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                <th className="px-4 sm:px-5 py-3">Contact</th>
                <th className="px-4 py-3 hidden md:table-cell">Phone / Email</th>
                <th className="px-4 py-3 hidden lg:table-cell">Source</th>
                <th className="px-4 py-3 hidden sm:table-cell">Tags</th>
                <th className="px-4 py-3 hidden md:table-cell">Last activity</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((f) => {
                const payment = PAYMENT_STYLE[f.paymentStatus]
                return (
                  <tr key={f.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 sm:px-5 py-3">
                      <a href={`/contacts/${f.id}`} className="flex items-center gap-3 group">
                        <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D72027] to-[#FFC107] text-white flex items-center justify-center text-xs font-extrabold shrink-0">
                          {initials(f.primaryParent ?? f.name)}
                        </span>
                        <div className="min-w-0">
                          <div className="font-extrabold text-zinc-900 group-hover:underline truncate">
                            {f.primaryParent ?? f.name}
                          </div>
                          {f.primaryParent && (
                            <div className="text-[11px] text-zinc-500 truncate">{f.name} family</div>
                          )}
                        </div>
                      </a>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-zinc-600 text-xs">
                      {f.phone && <div>{f.phone}</div>}
                      {f.email && <div className="text-zinc-400 truncate max-w-[220px]">{f.email}</div>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-zinc-500 text-xs">
                      {f.source ? (SOURCE_LABEL[f.source] ?? f.source) : '—'}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {f.tags.length === 0 ? (
                        <span className="text-zinc-300 text-xs">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-[260px]">
                          {f.tags.slice(0, 3).map((t) => (
                            <a
                              key={t}
                              href={`/contacts?tag=${encodeURIComponent(t)}`}
                              className="text-[10px] bg-zinc-100 text-zinc-700 font-bold px-1.5 py-0.5 rounded hover:bg-zinc-200"
                            >
                              #{t}
                            </a>
                          ))}
                          {f.tags.length > 3 && (
                            <span className="text-[10px] text-zinc-400 font-bold">+{f.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-zinc-500 text-xs">
                      {relativeTime(f.lastActivity)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded ${payment.cls}`}>
                        {payment.icon} {payment.label}
                      </span>
                      {f.lifecycle && (
                        <div className="mt-1">
                          <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${LIFECYCLE_CLS[f.lifecycle] ?? 'bg-zinc-100 text-zinc-500'}`}>
                            {f.lifecycle}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}
