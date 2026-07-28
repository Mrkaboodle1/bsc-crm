// /sites — list of sites & funnels. Tectonic-style: search, filter pills,
// create button. Each row links to the detail page (pages + settings).

import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { KIND_LABEL, type SiteKind } from '@/lib/sites/blocks'
import { RowActions } from '@/components/row-actions'
import { deleteSite } from './actions'

export default async function SitesIndex({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; q?: string }>
}) {
  const { kind, q } = await searchParams
  const user = await verifySession()
  const supabase = await createServerSupabase()

  let query = supabase
    .from('sites')
    .select('id, name, slug, kind, description, is_published, updated_at, custom_domain')
    .eq('tenant_id', user.tenantId)
    .order('updated_at', { ascending: false })
    .limit(200)
  if (kind) query = query.eq('kind', kind)
  if (q && q.trim()) query = query.ilike('name', `%${q.trim()}%`)

  const { data, error } = await query
  const tableMissing = !!error && (error.message.includes('does not exist') || error.message.includes('relation'))

  const sites = (data ?? []) as Array<{
    id: string; name: string; slug: string; kind: SiteKind;
    description: string | null; is_published: boolean;
    updated_at: string; custom_domain: string | null;
  }>

  return (
    <DashboardShell
      user={user}
      currentPath="/sites"
      pageTitle="Sites"
      pageSubtitle="Websites, funnels, and landing pages."
      pageActions={
        <a
          href="/sites/new"
          className="inline-flex items-center gap-2 bg-[#D72027] hover:bg-[#A0151B] text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm hover:shadow transition-colors"
        >
          + New site
        </a>
      }
    >
      {tableMissing && (
        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-4 py-3 mb-4 text-sm text-amber-900">
          <strong>Sites table missing.</strong> Apply{' '}
          <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">schema/009_sites.sql</code> in Supabase, then refresh.
        </div>
      )}

      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <a
          href="/sites"
          className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
            !kind ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
          }`}
        >
          All
        </a>
        {(Object.keys(KIND_LABEL) as SiteKind[]).map((k) => (
          <a
            key={k}
            href={`/sites?kind=${k}`}
            className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors capitalize ${
              kind === k ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
            }`}
          >
            {k}
          </a>
        ))}
        <form action="/sites" method="get" className="ml-auto flex items-center gap-1">
          {kind && <input type="hidden" name="kind" value={kind} />}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search sites…"
            className="text-sm px-3 py-1.5 border border-zinc-200 rounded-md focus:border-[#D72027] focus:ring-2 focus:ring-[#D72027]/20 focus:outline-none w-56 transition-shadow"
          />
        </form>
      </div>

      {sites.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                <th className="px-5 py-3">Name</th>
                <th className="px-4 py-3 hidden md:table-cell">Type</th>
                <th className="px-4 py-3 hidden sm:table-cell">Updated</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sites.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-3">
                    <a href={`/sites/${s.id}`} className="font-semibold text-zinc-900 hover:text-[#D72027] transition-colors">
                      {s.name}
                    </a>
                    {s.description && (
                      <div className="text-xs text-zinc-500 truncate max-w-md mt-0.5">{s.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-zinc-600 hidden md:table-cell capitalize">
                    {s.kind}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 hidden sm:table-cell tabular-nums">
                    {new Date(s.updated_at).toLocaleDateString('en-AU', { dateStyle: 'medium' })}
                  </td>
                  <td className="px-4 py-3">
                    {s.is_published ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-zinc-50 text-zinc-500 ring-1 ring-inset ring-zinc-200 px-2 py-0.5 rounded-full">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <a href={`/sites/${s.id}`} className="text-xs font-semibold text-[#D72027] hover:underline align-middle">
                      Open →
                    </a>
                    <RowActions
                      className="ml-1 align-middle"
                      deleteAction={deleteSite.bind(null, { id: s.id })}
                      confirmText={`Delete the site "${s.name}" and all its pages? This cannot be undone.`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-xl border-2 border-dashed border-zinc-200 p-12 text-center">
      <div className="w-12 h-12 mx-auto rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mb-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>
      </div>
      <h2 className="text-lg font-semibold text-zinc-900 mb-1">No sites yet</h2>
      <p className="text-sm text-zinc-500 mb-5 max-w-md mx-auto">
        Build a one-pager for a Term offer, a multi-page website for the studio,
        or a multi-step funnel for trial sign-ups.
      </p>
      <a
        href="/sites/new"
        className="inline-flex items-center gap-2 bg-[#D72027] hover:bg-[#A0151B] text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition-colors"
      >
        + Build your first site
      </a>
    </div>
  )
}
