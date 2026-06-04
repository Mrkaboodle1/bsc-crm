// /marketing/social — the unified Social hub: Calendar, Posts, Create,
// Library and Accounts in one professional, business-focused workspace.

import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { SocialHub, type SocialPost, type MediaItem } from '@/components/social-hub'

export default async function SocialPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const [{ data: posts }, { data: rawMedia }] = await Promise.all([
    supabase
      .from('posted_media')
      .select('id, caption, media_url, media_kind, platform, status, posted_at, scheduled_for, created_at, reach, likes, comments, shares, saves')
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
      .limit(500)
      .returns<SocialPost[]>(),
    supabase
      .from('media_assets')
      .select('id, url, alt_text, filename, source')
      .order('created_at', { ascending: false })
      .limit(60),
  ])

  const media: MediaItem[] = (rawMedia ?? []).map((m: { id: string; url: string | null; alt_text: string | null; filename: string | null; source: string | null }) => ({
    id: m.id, url: m.url, alt: m.alt_text || m.filename, kind: m.source,
  }))

  return (
    <DashboardShell user={user} currentPath="/marketing" pageTitle="Social" pageSubtitle="Plan, create and schedule your social media — all in one place">
      <SocialHub posts={posts ?? []} media={media} />
    </DashboardShell>
  )
}
