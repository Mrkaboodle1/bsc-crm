// Lead pipeline kanban. Cards come from TWO sources unified into one type:
// 1. families with lifecycle_stage in ('lead','trial') — Rhett's existing pipeline.
// 2. email_messages classified as a lead-intent type that don't yet have a
//    matched_family_id — fresh inbound from admin@ that Jacky's seen.
//
// Each card shows what Jacky (or you) has already done for that lead via the
// `action` badge: pending / approved / sent / failed / none.

export type LeadStage = 'new' | 'contacted' | 'trial_booked' | 'trialled' | 'enrolled' | 'lost'
export type LeadAction = 'none' | 'pending' | 'approved' | 'sent' | 'failed'

export type Lead = {
  id: string
  kind: 'family' | 'email'
  name: string
  parent: string | null
  email: string | null
  phone: string | null
  source: string | null
  classification: string | null
  stage: LeadStage
  receivedAt: string | null
  preview: string | null
  tags: string[]
  action: LeadAction
  href: string
}

const STAGES: { id: LeadStage; label: string; color: string }[] = [
  { id: 'new',          label: 'New enquiry',  color: 'border-amber-400 bg-amber-50' },
  { id: 'contacted',    label: 'Contacted',    color: 'border-blue-400 bg-blue-50' },
  { id: 'trial_booked', label: 'Trial booked', color: 'border-indigo-400 bg-indigo-50' },
  { id: 'trialled',     label: 'Trialled',     color: 'border-purple-400 bg-purple-50' },
  { id: 'enrolled',     label: 'Enrolled',     color: 'border-emerald-400 bg-emerald-50' },
  { id: 'lost',         label: 'Lost',         color: 'border-zinc-300 bg-zinc-50' },
]

const SOURCE_EMOJI: Record<string, string> = {
  fb_ad: '📘', instagram: '📸', google: '🔍', word_of_mouth: '💬',
  school: '🏫', walkin: '🚪', open_day: '🎪', email: '✉️', other: '✨',
}

const CLASSIFICATION_EMOJI: Record<string, string> = {
  trial_enquiry: '🎯',
  birthday_party: '🎉',
  ndis_enquiry: '💜',
  school_gig: '🏫',
  corporate_gig: '🏢',
  other: '✨',
}

const ACTION_STYLE: Record<LeadAction, { label: string; cls: string }> = {
  none:     { label: 'No action yet',  cls: 'bg-zinc-100 text-zinc-500' },
  pending:  { label: '✉️ Draft pending', cls: 'bg-amber-100 text-amber-900' },
  approved: { label: '✓ Approved',      cls: 'bg-blue-100 text-blue-900' },
  sent:     { label: '✅ Reply sent',   cls: 'bg-emerald-100 text-emerald-900' },
  failed:   { label: '✖ Send failed',   cls: 'bg-red-100 text-red-900' },
}

function relativeAge(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function LeadsKanban({ leads }: { leads: Lead[] }) {
  const byStage = STAGES.reduce<Record<LeadStage, Lead[]>>((acc, s) => {
    acc[s.id] = leads.filter((l) => l.stage === s.id)
    return acc
  }, { new: [], contacted: [], trial_booked: [], trialled: [], enrolled: [], lost: [] })

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-10 text-center text-zinc-500">
        <div className="text-5xl mb-3">🎯</div>
        <p className="font-bold text-zinc-700">No leads yet.</p>
        <p className="text-sm mt-1">
          New website enquiries to <span className="font-bold">admin@</span> will land here once Jacky classifies them.
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
      {STAGES.map((s) => (
        <div key={s.id} className="shrink-0 w-72 sm:w-80">
          <div className={`rounded-2xl border-2 ${s.color} h-full`}>
            <div className="px-4 py-3 flex items-center justify-between">
              <h3 className="font-extrabold text-zinc-900 text-sm uppercase tracking-wider">{s.label}</h3>
              <span className="bg-white text-zinc-700 text-xs font-extrabold px-2 py-0.5 rounded-full">
                {byStage[s.id].length}
              </span>
            </div>
            <ul className="px-3 pb-3 space-y-2">
              {byStage[s.id].length === 0 ? (
                <li className="text-xs text-zinc-400 text-center py-6">—</li>
              ) : (
                byStage[s.id].map((l) => <LeadCard key={l.id} lead={l} />)
              )}
            </ul>
          </div>
        </div>
      ))}
    </div>
  )
}

function LeadCard({ lead }: { lead: Lead }) {
  const classEmoji = lead.classification ? CLASSIFICATION_EMOJI[lead.classification] : null
  const sourceEmoji = lead.source ? SOURCE_EMOJI[lead.source] || '✨' : null
  const actionStyle = ACTION_STYLE[lead.action]
  return (
    <li>
      <a
        href={lead.href}
        className="block bg-white rounded-xl shadow-sm border border-zinc-200 p-3 hover:shadow-md hover:-translate-y-0.5 transition-all"
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-baseline gap-2 min-w-0 flex-1">
            <span className="font-extrabold text-zinc-900 truncate">{lead.name}</span>
            <span className="text-base shrink-0" title={lead.classification ?? lead.source ?? ''}>
              {classEmoji ?? sourceEmoji ?? '✨'}
            </span>
          </div>
          {lead.receivedAt && (
            <span className="text-[10px] text-zinc-400 shrink-0 mt-1">{relativeAge(lead.receivedAt)}</span>
          )}
        </div>
        {lead.parent && <div className="text-xs text-zinc-600 truncate">{lead.parent}</div>}
        {lead.email && <div className="text-[10px] text-zinc-500 truncate mt-0.5">{lead.email}</div>}
        {lead.phone && <div className="text-[10px] text-zinc-500">{lead.phone}</div>}
        {lead.preview && (
          <div className="text-[11px] text-zinc-600 mt-1.5 line-clamp-2 italic">
            “{lead.preview}”
          </div>
        )}
        {lead.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {lead.tags.map((t) => (
              <span key={t} className="text-[9px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded font-bold">
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className={`text-[10px] font-extrabold px-2 py-1 rounded ${actionStyle.cls}`}>
            {actionStyle.label}
          </span>
          {lead.kind === 'email' && (
            <span className="text-[10px] text-zinc-400 font-bold">📧 Inbox lead</span>
          )}
        </div>
      </a>
    </li>
  )
}
