// /marketing/social/new — the AI post composer (reached via "New Post" on the
// Social Planner). Generate copy + a matching image, then save/schedule.

import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { SocialComposer } from '../social-composer'

export default async function NewPostPage() {
  const user = await verifySession()
  return (
    <DashboardShell
      user={user}
      currentPath="/marketing"
      pageTitle="New Post"
      pageSubtitle="Generate a post + matching image with AI, then add it to your planner"
      pageActions={
        <a
          href="/marketing/social"
          className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
        >
          ← Back to planner
        </a>
      }
    >
      <SocialComposer />
    </DashboardShell>
  )
}
