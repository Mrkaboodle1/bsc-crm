// /sites/[id] — Tectonic-style page grid.
// Top: site name + tabs (Pages · Settings).
// Body: grid of page cards, each with a scaled-down iframe preview, name,
// status pill, and an Edit / ⋯ menu.
//
// "+ Add new page" opens a template picker (Home, About, Contact, Pricing,
// Trial, Thank-you, Blank) so new users never face a blank canvas.

import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { KIND_LABEL, type SiteKind } from '@/lib/sites/blocks'
import { SiteDetailClient } from './site-detail-client'

export default async function SiteDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const { data: site, error: siteErr } = await supabase
    .from('sites')
    .select('id, name, slug, kind, description, is_published, custom_domain, updated_at')
    .eq('id', id)
    .eq('tenant_id', user.tenantId)
    .maybeSingle()
  if (siteErr || !site) notFound()
  const typedSite = site as {
    id: string; name: string; slug: string; kind: SiteKind;
    description: string | null; is_published: boolean;
    custom_domain: string | null; updated_at: string;
  }

  const { data: pagesRaw } = await supabase
    .from('site_pages')
    .select('id, name, slug, is_published, updated_at, position')
    .eq('site_id', id)
    .order('position', { ascending: true })

  const pages = (pagesRaw ?? []) as Array<{ id: string; name: string; slug: string; is_published: boolean; updated_at: string; position: number }>

  return (
    <DashboardShell
      user={user}
      currentPath="/sites"
      pageTitle={typedSite.name}
      pageSubtitle={`${KIND_LABEL[typedSite.kind]} · ${pages.length} ${pages.length === 1 ? 'page' : 'pages'}`}
      pageActions={
        <a
          href="/sites"
          className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
        >
          ← All sites
        </a>
      }
    >
      <SiteDetailClient
        site={typedSite}
        pages={pages}
        activeTab={(tab as 'pages' | 'settings') ?? 'pages'}
      />
    </DashboardShell>
  )
}
