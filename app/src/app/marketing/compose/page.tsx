import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { ComposeForm } from './compose-form'
import { logPost } from './actions'

export default async function ComposePage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  // Show last 10 posts so Rhett knows what's recently been used
  const { data: recent } = await supabase
    .from('posted_media')
    .select('id, platform, caption, posted_at, media_kind, ai_prompt')
    .order('posted_at', { ascending: false, nullsFirst: false })
    .limit(10)

  return (
    <DashboardShell
      user={user}
      currentPath="/marketing"
      pageTitle="Compose a post"
      pageSubtitle="AI-generated image (free) + caption + platform. Auto-blocks repeats from the last 30 days."
      pageActions={
        <a
          href="/marketing"
          className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
        >
          ← Marketing
        </a>
      }
    >
      <ComposeForm
        action={logPost}
        recent={(recent ?? []).map((r) => ({
          id: r.id,
          platform: r.platform,
          caption: r.caption,
          postedAt: r.posted_at,
          mediaKind: r.media_kind,
          aiPrompt: r.ai_prompt,
        }))}
      />
    </DashboardShell>
  )
}
