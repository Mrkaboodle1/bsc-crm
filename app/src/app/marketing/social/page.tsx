// /marketing/social — AI-powered social media post composer.
// Pick a platform, type a topic, click generate. OpenAI returns 3 variants
// of post copy (platform-aware tone, length, hashtags). Optionally generate
// a matching image with DALL-E 3 or Pollinations, save to media library,
// ready to copy/paste into Facebook/Instagram/LinkedIn/etc.

import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { SocialComposer } from './social-composer'

export default async function SocialComposerPage() {
  const user = await verifySession()
  return (
    <DashboardShell
      user={user}
      currentPath="/marketing"
      pageTitle="Social media composer"
      pageSubtitle="Generate a post + matching image with AI. Copy, paste, post."
    >
      <SocialComposer />
    </DashboardShell>
  )
}
