// /sites — list of sites & funnels. Tectonic-style: search, filter pills,
// create button. Each row links to the detail page (pages + settings).

import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { KIND_LABEL, type SiteKind } from '@/lib/sites/blocks'

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
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg"
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
          className={`text-xs font-extrabold px-3 py-1.5 rounded-lg ${
            !kind ? 'bg-zinc-900 text-white shadow' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          }`}
        >
          All
        </a>
        {(Object.keys(KIND_LABEL) as SiteKind[]).map((k) => (
          <a
            key={k}
            href={`/sites?kind=${k}`}
            className={`text-xs font-extrabold px-3 py-1.5 rounded-lg ${
              kind === k ? 'bg-zinc-900 text-white shadow' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            {KIND_LABEL[k]}
          </a>
        ))}
        <form action="/sites" method="get" className="ml-auto flex items-center gap-1">
          {kind && <input type="hidden" name="kind" value={kind} />}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="🔍 Search sites…"
            className="text-xs font-bold px-3 py-1.5 border-2 border-zinc-200 rounded-lg focus:border-[#D72027] focus:outline-none w-56"
          />
        </form>
      </div>

      {sites.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-left">
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Name</th>
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Type</th>
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Last updated</th>
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <a href={`/sites/${s.id}`} className="font-extrabold text-zinc-900 hover:text-[#D72027]">
                      {s.name}
                    </a>
                    {s.description && (
                      <div className="text-xs text-zinc-500 truncate max-w-xs">{s.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-zinc-700">
                    {KIND_LABEL[s.kind]}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(s.updated_at).toLocaleDateString('en-AU', { dateStyle: 'medium' })}
                  </td>
                  <td className="px-4 py-3">
                    {s.is_published ? (
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                        ● Live
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a href={`/sites/${s.id}`} className="text-xs font-bold text-[#D72027] hover:underline">
                      Open →
                    </a>
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
    <div className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-zinc-200 p-12 text-center">
      <div className="text-5xl mb-3">🪧</div>
      <h2 className="text-xl font-extrabold text-zinc-900 mb-1">No sites yet</h2>
      <p className="text-sm text-zinc-600 mb-5 max-w-md mx-auto">
        Build a one-pager for a Term offer, a multi-page website for the studio,
        or a multi-step funnel for trial sign-ups — all from here.
      </p>
      <a
        href="/sites/new"
        className="inline-block bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-5 py-3 rounded-xl shadow-md hover:shadow-lg"
      >
        + Build your first site
      </a>
    </div>
  )
}
