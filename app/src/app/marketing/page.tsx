import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { MarketingOverview } from '@/components/marketing-overview'
import { mediaStats } from '@/data/media-stats'

export default async function MarketingPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  // Posted-media history — tells us what we've used recently
  const { data: posted } = await supabase
    .from('posted_media')
    .select('id, media_hash, platform, posted_at, caption')
    .order('posted_at', { ascending: false })
    .limit(20)

  return (
    <DashboardShell
      user={user}
      currentPath="/marketing"
      pageTitle="Marketing"
      pageSubtitle="Media library, AI image generation, post composer."
      pageActions={
        <div className="flex items-center gap-2">
          <a
            href="/marketing/bulk-send"
            className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
          >
            📨 Bulk send
          </a>
          <a
            href="/marketing/compose"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg"
          >
            ✏️ Compose post
          </a>
        </div>
      }
    >
      <MarketingOverview
        stats={mediaStats}
        recentPosts={(posted ?? []).map((p) => ({
          id: p.id,
          mediaHash: p.media_hash,
          platform: p.platform,
          postedAt: p.posted_at,
          caption: p.caption,
        }))}
      />
    </DashboardShell>
  )
}
