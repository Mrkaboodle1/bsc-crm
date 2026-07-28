import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { SequenceEditor } from '@/components/sequence-editor'

export const dynamic = 'force-dynamic'

// The free-trial sequence (matches lib/free-trial-emails.ts) — shown with live stats.
const SEQ = [
  { tag: 'ft1', name: 'Email 1 — Welcome', when: 'Instant', subject: '🎪 Welcome to BigStar Circus — you’re in!' },
  { tag: 'ft2', name: 'Email 2 — Save the dates', when: '+2 days', subject: '📅 Save these dates — what’s coming up' },
  { tag: 'ft3', name: 'Email 3 — Why kids stay', when: '+3 days', subject: '🌟 Why kids stay at BigStar for years' },
  { tag: 'ft4', name: 'Email 4 — Practical bits', when: '+4 days', subject: '❓ Make-up classes, payments & tips' },
  { tag: 'ft5', name: 'Email 5 — Share the magic', when: '+6 days', subject: '💛 Share the magic — invite a friend' },
  { tag: 'ft6', name: 'Email 6 — Meet the coaches', when: '+8 days', subject: '🤸 Meet your BigStar coaches' },
]

export default async function AutomationsPage() {
  const user = await verifySession()
  const admin = createAdminSupabase()
  const { data: events } = await admin.from('email_events').select('resend_id, event_type, tag').not('tag', 'is', null).limit(20000)

  // distinct emails (resend_id) per tag per event type
  const agg: Record<string, Record<string, Set<string>>> = {}
  for (const e of events ?? []) {
    const t = e.tag as string
    const a = (agg[t] ||= {})
    ;(a[e.event_type] ||= new Set()).add(e.resend_id as string)
    ;(a['_all'] ||= new Set()).add(e.resend_id as string)
  }
  const stat = (tag: string) => {
    const a = agg[tag] || {}
    const total = (a['_all']?.size) || 0
    const n = (k: string) => a[k]?.size || 0
    const pct = (x: number) => total ? Math.round((x / total) * 100) : 0
    return { total, delivered: n('delivered'), opened: n('opened'), clicked: n('clicked'), bounced: n('bounced'), complained: n('complained'), openRate: pct(n('opened')), clickRate: pct(n('clicked')), deliverRate: pct(n('delivered')) }
  }

  return (
    <DashboardShell user={user} currentPath="/automations" pageTitle="🤖 Automations & Email Stats" pageSubtitle="Your Free-Trial funnel — live performance of every email">
      <div className="max-w-4xl space-y-3">
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 text-sm text-zinc-600">
          <b>Free-Trial funnel</b> — runs automatically on every new trial form. Stats update as Resend reports delivered / opened / clicked. (Opens &amp; clicks need email tracking enabled in Resend.)
        </div>
        {SEQ.map((s) => {
          const st = stat(s.tag)
          return (
            <div key={s.tag} className="bg-white rounded-2xl border border-zinc-200 p-4">
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <div>
                  <div className="font-extrabold text-zinc-900">{s.name} <span className="text-xs font-normal text-zinc-400">· {s.when}</span></div>
                  <div className="text-xs text-zinc-500">{s.subject}</div>
                </div>
                <div className="text-xs font-bold text-zinc-500">{st.total} sent</div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
                <Stat label="Delivered" value={`${st.deliverRate}%`} sub={`${st.delivered}`} />
                <Stat label="Opened" value={`${st.openRate}%`} sub={`${st.opened}`} accent="emerald" />
                <Stat label="Clicked" value={`${st.clickRate}%`} sub={`${st.clicked}`} accent="violet" />
                <Stat label="Bounced" value={`${st.bounced}`} sub="" accent={st.bounced ? 'red' : undefined} />
                <Stat label="Complaints" value={`${st.complained}`} sub="" accent={st.complained ? 'red' : undefined} />
              </div>
            </div>
          )
        })}

        <div className="pt-4">
          <SequenceEditor />
        </div>
      </div>
    </DashboardShell>
  )
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: 'emerald' | 'violet' | 'red' }) {
  const c = accent === 'emerald' ? 'text-emerald-700' : accent === 'violet' ? 'text-violet-700' : accent === 'red' ? 'text-red-600' : 'text-zinc-900'
  return (
    <div className="bg-zinc-50 rounded-xl p-2.5 text-center">
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-400">{label}</div>
      <div className={`text-lg font-extrabold ${c}`}>{value}</div>
      {sub && <div className="text-[10px] text-zinc-400">{sub}</div>}
    </div>
  )
}
