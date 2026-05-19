// Authenticated preview route — renders a page using the editor's
// session so even unpublished pages show in the iframe thumbnails on
// /sites/[id]. Uses the same <PageBody /> as the public renderer.

import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { PageBody } from '@/components/sites/block-view'
import { type Block } from '@/lib/sites/blocks'

export const dynamic = 'force-dynamic'

export default async function PagePreview({
  params,
}: {
  params: Promise<{ id: string; pageId: string }>
}) {
  const { pageId } = await params
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const { data } = await supabase
    .from('site_pages')
    .select('id, name, blocks, seo_title')
    .eq('id', pageId)
    .eq('tenant_id', user.tenantId)
    .maybeSingle()
  if (!data) notFound()

  const blocks = Array.isArray(data.blocks) ? (data.blocks as Block[]) : []

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <PageBody blocks={blocks} />
      </main>
    </div>
  )
}
