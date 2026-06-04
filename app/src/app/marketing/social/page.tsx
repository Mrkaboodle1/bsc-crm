// /marketing/social — Social Planner. One clean place to see every social post:
// what's published, scheduled, draft or failed, across Instagram + Facebook +
// more. Built to feel like a planner a non-technical owner can run.

import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { SocialPlanner, type SocialPost } from '@/components/social-planner'

export default async function SocialPlannerPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const { data } = await supabase
    .from('posted_media')
    .select('id, caption, media_url, media_kind, platform, status, posted_at, scheduled_for, created_at, reach, likes, comments, shares, saves')
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })
    .limit(300)
    .returns<SocialPost[]>()

  return (
    <DashboardShell
      user={user}
      currentPath="/marketing"
      pageTitle="Social Planner"
      pageSubtitle="Every post in one place — published, scheduled, draft or failed"
      pageActions={
        <a
          href="/marketing/social/new"
          className="inline-flex items-center gap-2 bg-[#D72027] text-white font-bold text-sm px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-base leading-none">＋</span> New Post
        </a>
      }
    >
      <SocialPlanner posts={data ?? []} />
    </DashboardShell>
  )
}
