import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { Globe, CheckCircle2, Clock } from 'lucide-react'

export default async function DomainsPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name, slug, custom_domain, is_published')
    .order('created_at', { ascending: true })

  const core = [
    { name: 'Big Star website', domain: 'bigstarcircus.com.au', status: 'connected' as const, note: 'Your main website' },
    { name: 'CRM (this app)', domain: 'app-chi-silk-29.vercel.app', status: 'connected' as const, note: 'Your Big Star HQ login' },
  ]

  return (
    <DashboardShell user={user} currentPath="/marketing/domains" pageTitle="Domains" pageSubtitle="Every web address connected to Big Star, in one place.">
      <div className="space-y-5 max-w-3xl">
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100 text-xs font-bold uppercase tracking-wide text-zinc-500">Connected</div>
          <ul className="divide-y divide-zinc-50">
            {core.map((d) => <DomainRow key={d.domain} name={d.name} domain={d.domain} status={d.status} note={d.note} />)}
            {(sites ?? []).map((s) => (
              <DomainRow
                key={s.id}
                name={s.name}
                domain={s.custom_domain || `app-chi-silk-29.vercel.app/s/${s.slug}`}
                status={s.is_published ? 'connected' : 'pending'}
                note={s.custom_domain ? 'Custom domain' : 'Hosted page'}
              />
            ))}
          </ul>
        </div>

        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <strong>Want to connect a new domain?</strong> Just tell Jacky the web address (e.g. a campaign domain) and what it should point to — I&apos;ll handle the technical setup and it&apos;ll appear here as Connected.
        </div>
      </div>
    </DashboardShell>
  )
}

function DomainRow({ name, domain, status, note }: { name: string; domain: string; status: 'connected' | 'pending'; note: string }) {
  return (
    <li className="flex items-center gap-3 px-5 py-3.5">
      <span className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 shrink-0"><Globe size={17} /></span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm text-zinc-900 truncate">{name}</div>
        <a href={`https://${domain.split('/')[0]}`} target="_blank" className="text-xs text-zinc-500 hover:text-[#D72027] truncate block">{domain}</a>
      </div>
      <span className="text-[11px] text-zinc-400 hidden sm:block">{note}</span>
      {status === 'connected' ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full"><CheckCircle2 size={12} /> Connected</span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-full"><Clock size={12} /> Draft</span>
      )}
    </li>
  )
}
