// Public home page for a site — /s/<siteSlug>
// Renders the page with slug='' (the bootstrapped Home page).

import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { PageBody } from '@/components/sites/block-view'
import { type Block } from '@/lib/sites/blocks'

export const dynamic = 'force-dynamic'

export default async function PublicSiteHome({
  params,
}: {
  params: Promise<{ siteSlug: string }>
}) {
  const { siteSlug } = await params
  return <PublicRenderer siteSlug={siteSlug} pageSlug={''} />
}

// Exported so /s/[siteSlug]/[pageSlug] can reuse the same renderer.
//
// Note: this uses the regular anon-key client. The sites_public_read /
// site_pages_public_read RLS policies (migration 009c) let anonymous
// visitors SELECT rows where is_published = TRUE. No service-role key
// required, and security stays scoped to published content only.
export async function PublicRenderer({ siteSlug, pageSlug }: { siteSlug: string; pageSlug: string }) {
  const supabase = await createServerSupabase()

  // 1. Find the site by slug — must be published.
  const { data: site } = await supabase
    .from('sites')
    .select('id, name, kind, theme, is_published, tenant_id')
    .eq('slug', siteSlug)
    .eq('is_published', true)
    .maybeSingle()
  if (!site) notFound()

  // 2. Find the page within that site by slug — must be published.
  const { data: page } = await supabase
    .from('site_pages')
    .select('id, name, slug, blocks, seo_title, seo_description')
    .eq('site_id', site.id)
    .eq('slug', pageSlug)
    .eq('is_published', true)
    .maybeSingle()
  if (!page) notFound()

  const blocks = Array.isArray(page.blocks) ? (page.blocks as Block[]) : []

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <PageBody blocks={blocks} />
      </main>
      <footer className="border-t border-zinc-100 py-6 mt-10 text-center text-xs text-zinc-400">
        Built with Big Star CRM
      </footer>
    </div>
  )
}
