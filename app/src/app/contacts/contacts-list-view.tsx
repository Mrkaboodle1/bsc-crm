// Tectonic-style contacts list. Rows: avatar + name + parent · phone · email
// · tags (add/remove inline) · created · last activity · payment status pill.

import { ContactTags } from '@/components/contact-tags'

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
  created: string | null
}

const LIFECYCLE_CLS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  trial:  'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
  lead:   'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  paused: 'bg-zinc-50 text-zinc-600 ring-1 ring-inset ring-zinc-200',
  past:   'bg-zinc-50 text-zinc-500 ring-1 ring-inset ring-zinc-200',
  lost:   'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
}

// Compact status pills. Icon column dropped — the colour does the work and
// the emoji felt amateur in a denser table.
const PAYMENT_STYLE: Record<PaymentStatus, { label: string; cls: string }> = {
  subscribed: { label: 'Paying',     cls: 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200' },
  trial:      { label: 'Trial',      cls: 'bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200' },
  lead:       { label: 'Lead',       cls: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200' },
  not_paying: { label: 'Not paying', cls: 'bg-red-50 text-red-800 ring-1 ring-inset ring-red-200' },
  unknown:    { label: '—',          cls: 'bg-zinc-50 text-zinc-500 ring-1 ring-inset ring-zinc-200' },
}

const SOURCE_LABEL: Record<string, string> = {
  fb_ad:         'Facebook',
  instagram:     'Instagram',
  google:        'Google',
  word_of_mouth: 'Word of mouth',
  school:        'School',
  walkin:        'Walk-in',
  open_day:      'Open day',
  email:         'Email',
  other:         'Other',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
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
      <form className="bg-white rounded-xl border border-zinc-200 p-3 flex items-center gap-2 flex-wrap">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name, email, or phone…"
          className="flex-1 min-w-[200px] px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:ring-2 focus:ring-[#D72027]/20 focus:outline-none transition-shadow"
        />
        <select
          name="stage"
          defaultValue={stage}
          className="px-3 py-2 border border-zinc-200 rounded-lg text-sm font-medium focus:border-[#D72027] focus:outline-none bg-white"
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
          className="px-3 py-2 border border-zinc-200 rounded-lg text-sm font-medium focus:border-[#D72027] focus:outline-none bg-white"
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
            className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none bg-white"
          >
            <option value="">Any tag</option>
            {topTags.map((t) => (
              <option key={t} value={t}>#{t}</option>
            ))}
          </select>
        )}
        <button type="submit" className="bg-zinc-900 text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-zinc-800">
          Filter
        </button>
        {(q || stage || tag || source) && (
          <a href="/contacts" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 px-2">
            Clear
          </a>
        )}
      </form>

      {/* List */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 mx-auto flex items-center justify-center mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <p className="font-semibold text-zinc-700">No contacts match.</p>
          <p className="text-xs text-zinc-500 mt-1">Try clearing a filter or adjusting your search.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                <th className="px-4 sm:px-5 py-3">Contact</th>
                <th className="px-4 py-3 hidden md:table-cell">Phone</th>
                <th className="px-4 py-3 hidden lg:table-cell">Email</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3 hidden lg:table-cell">Created</th>
                <th className="px-4 py-3 hidden xl:table-cell">Last activity</th>
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
                        <span className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center text-xs font-semibold shrink-0 ring-1 ring-zinc-200 group-hover:ring-zinc-300">
                          {initials(f.primaryParent ?? f.name)}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-zinc-900 group-hover:text-[#D72027] truncate transition-colors">
                            {f.primaryParent ?? f.name}
                          </div>
                          {f.primaryParent && (
                            <div className="text-[11px] text-zinc-500 truncate">{f.name} family</div>
                          )}
                        </div>
                      </a>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-zinc-700 text-xs whitespace-nowrap">
                      {f.phone || <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-zinc-500 text-xs">
                      {f.email ? <span className="truncate inline-block max-w-[220px] align-bottom">{f.email}</span> : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <ContactTags id={f.id} tags={f.tags} suggestions={topTags} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-zinc-500 text-xs whitespace-nowrap">
                      {fmtDate(f.created)}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-zinc-500 text-xs tabular-nums whitespace-nowrap">
                      {relativeTime(f.lastActivity)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${payment.cls}`}>
                        {payment.label}
                      </span>
                      {f.lifecycle && (
                        <div className="mt-1">
                          <span className={`text-[10px] font-semibold capitalize px-1.5 py-0.5 rounded ${LIFECYCLE_CLS[f.lifecycle] ?? 'bg-zinc-100 text-zinc-500'}`}>
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
