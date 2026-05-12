// Lead pipeline kanban. Pure presentational for now — drag-and-drop comes
// in Slice 5 proper.

export type LeadStage = 'new' | 'contacted' | 'trial_booked' | 'trialled' | 'enrolled' | 'lost'

export type Lead = {
  id: string
  name: string
  parent: string | null
  email: string | null
  phone: string | null
  source: string | null
  stage: LeadStage
  createdAt: string | null
  notes: string | null
  tags: string[]
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
  school: '🏫', walkin: '🚪', open_day: '🎪', other: '✨',
}

export function LeadsKanban({ leads }: { leads: Lead[] }) {
  const byStage = STAGES.reduce<Record<LeadStage, Lead[]>>((acc, s) => {
    acc[s.id] = leads.filter((l) => l.stage === s.id)
    return acc
  }, { new: [], contacted: [], trial_booked: [], trialled: [], enrolled: [], lost: [] })

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
                <li className="text-xs text-zinc-400 text-center py-6">No leads at this stage</li>
              ) : (
                byStage[s.id].map((l) => (
                  <li key={l.id}>
                    <a
                      href={`/families/${l.id}`}
                      className="block bg-white rounded-xl shadow-sm border border-zinc-200 p-3 hover:shadow-md hover:-translate-y-0.5 transition-all"
                    >
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-extrabold text-zinc-900 truncate">{l.name}</span>
                        {l.source && <span title={l.source} className="text-base">{SOURCE_EMOJI[l.source] || '✨'}</span>}
                      </div>
                      {l.parent && <div className="text-xs text-zinc-600 truncate">{l.parent}</div>}
                      {l.email && <div className="text-[10px] text-zinc-500 truncate mt-0.5">{l.email}</div>}
                      {l.phone && <div className="text-[10px] text-zinc-500">{l.phone}</div>}
                      {l.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {l.tags.map((t) => (
                            <span key={t} className="text-[9px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded font-bold">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </a>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ))}
    </div>
  )
}
