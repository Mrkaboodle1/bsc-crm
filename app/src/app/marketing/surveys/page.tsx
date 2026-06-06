import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { CopyButton } from '@/components/copy-button'
import { ExternalLink, Star } from 'lucide-react'

const BASE = 'https://app-chi-silk-29.vercel.app'
const SURVEYS = [
  { slug: 'term-feedback', name: 'End-of-term feedback', desc: 'A 20-second star rating + comment after each term.' },
  { slug: 'class-feedback', name: 'Class check-in', desc: 'Quick pulse-check on how a class is going.' },
]

export default async function SurveysPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data: responses } = await supabase
    .from('pending_actions').select('id, draft_subject, draft_body, created_at')
    .eq('kind', 'note').ilike('draft_subject', '%Survey%')
    .order('created_at', { ascending: false }).limit(20)

  return (
    <DashboardShell user={user} currentPath="/marketing/surveys" pageTitle="Surveys" pageSubtitle="Gather parent feedback — happy families, happy reviews.">
      <div className="space-y-6 max-w-4xl">
        <div className="grid md:grid-cols-2 gap-4">
          {SURVEYS.map((s) => {
            const url = `${BASE}/survey/${s.slug}`
            return (
              <div key={s.slug} className="bg-white rounded-xl border border-zinc-200 p-5">
                <h3 className="font-semibold text-zinc-900">{s.name}</h3>
                <p className="text-xs text-zinc-500 mt-1 mb-4">{s.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  <a href={url} target="_blank" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#D72027] hover:bg-[#A0151B] rounded-md px-2.5 py-1.5"><ExternalLink size={13} /> Preview</a>
                  <CopyButton text={url} label="Copy link" />
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100 text-xs font-bold uppercase tracking-wide text-zinc-500 flex items-center gap-1.5"><Star size={13} /> Recent responses ({responses?.length ?? 0})</div>
          {(responses?.length ?? 0) === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-400">No responses yet — share a survey link after class or at term&apos;s end.</div>
          ) : (
            <ul className="divide-y divide-zinc-50">
              {(responses ?? []).map((r) => (
                <li key={r.id} className="px-5 py-3">
                  <div className="text-sm text-zinc-800 whitespace-pre-wrap">{(r.draft_body ?? '').replace(/^New .*submission\.\n?/, '')}</div>
                  <div className="text-[11px] text-zinc-400 mt-1">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'Australia/Brisbane' }) : ''}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
