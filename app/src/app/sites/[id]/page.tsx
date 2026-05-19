// /sites/[id] — site detail. Shows the list of pages inside the site,
// publish/unpublish toggle, public URL, and a delete button.

import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { KIND_LABEL, type SiteKind } from '@/lib/sites/blocks'
import { SiteHeaderActions, AddPageButton } from './header-actions'

export default async function SiteDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const { data: site, error: siteErr } = await supabase
    .from('sites')
    .select('id, name, slug, kind, description, is_published, custom_domain, updated_at')
    .eq('id', id)
    .eq('tenant_id', user.tenantId)
    .maybeSingle()
  if (siteErr || !site) notFound()
  const typedSite = site as { id: string; name: string; slug: string; kind: SiteKind; description: string | null; is_published: boolean; custom_domain: string | null; updated_at: string }

  const { data: pagesRaw } = await supabase
    .from('site_pages')
    .select('id, name, slug, is_published, updated_at, position')
    .eq('site_id', id)
    .order('position', { ascending: true })

  const pages = (pagesRaw ?? []) as Array<{ id: string; name: string; slug: string; is_published: boolean; updated_at: string; position: number }>
  const publicUrl = `/s/${typedSite.slug}`

  return (
    <DashboardShell
      user={user}
      currentPath="/sites"
      pageTitle={typedSite.name}
      pageSubtitle={`${KIND_LABEL[typedSite.kind]} · ${pages.length} ${pages.length === 1 ? 'page' : 'pages'}`}
      pageActions={
        <SiteHeaderActions
          siteId={typedSite.id}
          siteSlug={typedSite.slug}
          siteName={typedSite.name}
          published={typedSite.is_published}
        />
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Pages list */}
        <main className="xl:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-700">
                Pages
              </h2>
              <AddPageButton siteId={typedSite.id} />
            </div>
            {pages.length === 0 ? (
              <div className="p-10 text-center text-sm text-zinc-500">
                No pages yet. Add one to start designing.
              </div>
            ) : (
              <ul>
                {pages.map((p, i) => (
                  <li key={p.id} className={`px-5 py-3 flex items-center gap-3 hover:bg-zinc-50 ${i > 0 ? 'border-t border-zinc-100' : ''}`}>
                    <span className="w-6 h-6 rounded bg-zinc-100 text-zinc-600 text-[10px] font-extrabold flex items-center justify-center">
                      {p.position + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <a
                        href={`/sites/${typedSite.id}/pages/${p.id}/edit`}
                        className="font-extrabold text-zinc-900 hover:text-[#D72027]"
                      >
                        {p.name}
                      </a>
                      <div className="text-[11px] text-zinc-500">
                        {publicUrl}{p.slug ? `/${p.slug}` : ''}
                      </div>
                    </div>
                    {p.is_published ? (
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">● Live</span>
                    ) : (
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">Draft</span>
                    )}
                    <a
                      href={`/sites/${typedSite.id}/pages/${p.id}/edit`}
                      className="text-xs font-bold text-[#D72027] hover:underline"
                    >
                      Edit →
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>

        {/* Settings rail */}
        <aside className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
            <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-3">Public URL</h3>
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm font-mono text-zinc-700 break-all">
              {publicUrl}
            </div>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-xs font-extrabold text-[#D72027] hover:underline"
            >
              Preview live →
            </a>
            {typedSite.custom_domain && (
              <div className="mt-3 text-xs">
                <span className="text-zinc-500">Custom domain:</span>{' '}
                <span className="font-bold text-zinc-800">{typedSite.custom_domain}</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
            <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-2">About</h3>
            <p className="text-sm text-zinc-700">{typedSite.description ?? <span className="text-zinc-400">No description set.</span>}</p>
          </div>
        </aside>
      </div>
    </DashboardShell>
  )
}
