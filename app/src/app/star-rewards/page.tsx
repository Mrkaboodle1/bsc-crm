// /star-rewards — Star Reward design library.
// Designs live in tenants.settings.reward_designs (JSON); falls back to the
// built-in BSC defaults until the owner customises. Owners/managers can
// add and delete designs right here.

import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { ExternalLink } from 'lucide-react'
import { DEFAULT_DESIGNS, normaliseDesigns } from '@/lib/reward-designs'
import { RewardDesignsClient } from '@/components/reward-designs-client'

export const dynamic = 'force-dynamic'

export default async function StarRewardsPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data: t } = await supabase.from('tenants').select('settings').eq('id', user.tenantId).maybeSingle()
  const settings = (t?.settings ?? {}) as Record<string, unknown>
  const designs = 'reward_designs' in settings ? normaliseDesigns(settings.reward_designs) : DEFAULT_DESIGNS
  const canManage = ['owner', 'manager'].includes(user.role)

  return (
    <DashboardShell
      user={user}
      currentPath="/star-rewards"
      pageTitle="Star Reward Designs"
      pageSubtitle="The Canva print masters for every Star Reward card."
      pageActions={
        <a href="https://www.canva.com/folder/FAFNWiFNCnM" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-[#D72027] hover:bg-[#A0151B] text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm transition-colors">
          <ExternalLink size={14} /> Open Canva folder
        </a>
      }
    >
      <RewardDesignsClient designs={designs} canManage={canManage} />
    </DashboardShell>
  )
}
