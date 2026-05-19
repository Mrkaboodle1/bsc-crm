// Server entry for the page editor — loads the page row + parents and
// hands off to the client editor. The editor itself manages blocks state
// + autosave via server actions.

import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { type Block } from '@/lib/sites/blocks'
import { PageEditor } from './page-editor'

export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string; pageId: string }>
}) {
  const { id, pageId } = await params
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const [siteRes, pageRes] = await Promise.all([
    supabase.from('sites').select('id, name, slug').eq('id', id).eq('tenant_id', user.tenantId).maybeSingle(),
    supabase
      .from('site_pages')
      .select('id, name, slug, blocks, is_published, seo_title, seo_description')
      .eq('id', pageId)
      .eq('tenant_id', user.tenantId)
      .maybeSingle(),
  ])

  if (!siteRes.data || !pageRes.data) notFound()
  const site = siteRes.data as { id: string; name: string; slug: string }
  const page = pageRes.data as {
    id: string; name: string; slug: string; blocks: unknown;
    is_published: boolean; seo_title: string | null; seo_description: string | null;
  }
  const blocks = Array.isArray(page.blocks) ? (page.blocks as Block[]) : []

  return (
    <DashboardShell
      user={user}
      currentPath="/sites"
      pageTitle={`Edit: ${page.name}`}
      pageSubtitle={`${site.name} · /${page.slug || ''}`}
      pageActions={
        <a
          href={`/sites/${site.id}`}
          className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
        >
          ← Back to site
        </a>
      }
    >
      <PageEditor
        pageId={page.id}
        siteSlug={site.slug}
        pageSlug={page.slug}
        initialBlocks={blocks}
        initialName={page.name}
        initialSeoTitle={page.seo_title ?? ''}
        initialSeoDescription={page.seo_description ?? ''}
        initialPublished={page.is_published}
      />
    </DashboardShell>
  )
}
