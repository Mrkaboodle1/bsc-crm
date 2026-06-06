import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { CopyButton } from '@/components/copy-button'
import { ExternalLink } from 'lucide-react'

const BASE = 'https://app-chi-silk-29.vercel.app'

export default async function QuizzesPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data: leads } = await supabase
    .from('families').select('id, family_name, email, phone, created_at')
    .contains('tags', ['quiz-class-match']).order('created_at', { ascending: false }).limit(15)
  const url = `${BASE}/quiz/class-match`
  const embed = `<iframe src="${url}" width="100%" height="620" style="border:0;border-radius:16px"></iframe>`

  return (
    <DashboardShell user={user} currentPath="/marketing/quizzes" pageTitle="Quizzes" pageSubtitle="Fun quizzes that recommend a class and capture the lead.">
      <div className="space-y-6 max-w-4xl">
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-semibold text-zinc-900">Which class suits my child?</h3>
              <p className="text-sm text-zinc-500 mt-1 max-w-md">A 30-second quiz that recommends the right Big Star class, then books a free trial. Every finisher becomes a tagged lead.</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <a href={url} target="_blank" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#D72027] hover:bg-[#A0151B] rounded-md px-2.5 py-1.5"><ExternalLink size={13} /> Preview</a>
              <CopyButton text={url} label="Copy link" />
              <CopyButton text={embed} label="Embed code" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100 text-xs font-bold uppercase tracking-wide text-zinc-500">Leads from this quiz ({leads?.length ?? 0})</div>
          {(leads?.length ?? 0) === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-400">No quiz leads yet — share the link above on socials or your website.</div>
          ) : (
            <ul className="divide-y divide-zinc-50">
              {(leads ?? []).map((l) => (
                <li key={l.id} className="px-5 py-3 flex items-center gap-3">
                  <a href={`/contacts/${l.id}`} className="font-medium text-sm text-zinc-800 hover:text-[#D72027] flex-1 truncate">{l.family_name}</a>
                  <span className="text-xs text-zinc-500 truncate max-w-[200px]">{l.email || l.phone || ''}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
