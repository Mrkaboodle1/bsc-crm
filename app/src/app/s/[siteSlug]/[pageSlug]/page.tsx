// Public page within a site — /s/<siteSlug>/<pageSlug>
// Delegates to the same PublicRenderer used by the home route.

import { PublicRenderer } from '../page'

export const dynamic = 'force-dynamic'

export default async function PublicSitePage({
  params,
}: {
  params: Promise<{ siteSlug: string; pageSlug: string }>
}) {
  const { siteSlug, pageSlug } = await params
  return <PublicRenderer siteSlug={siteSlug} pageSlug={pageSlug} />
}
