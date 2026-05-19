import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { MarketingOverview } from '@/components/marketing-overview'
import { mediaStats } from '@/data/media-stats'
import { LinkButton } from '@/components/ui/button'
import { Send, Sparkles } from 'lucide-react'

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
      pageSubtitle="Generate posts, design pages, and reach your families."
      pageActions={
        <div className="flex items-center gap-2">
          <LinkButton href="/marketing/bulk-send" variant="outline" size="md" icon={Send}>
            Bulk send
          </LinkButton>
          <LinkButton href="/marketing/social" variant="primary" size="md" icon={Sparkles}>
            AI social post
          </LinkButton>
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
