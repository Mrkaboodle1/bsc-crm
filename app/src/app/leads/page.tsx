import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { LeadPipeline, type PFamily } from '@/components/lead-pipeline'

export const dynamic = 'force-dynamic'

const COLS = 'id, family_name, primary_parent, email, phone, source, lifecycle_stage, weekly_fee_total'

export default async function LeadsPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  // Non-lead stages (smaller sets) — show all. Leads (often hundreds) — show the
  // most recent 80 as cards, with a "+N more" link to the full Contacts list.
  const [{ data: others }, { data: recentLeads }, { count: leadTotal }] = await Promise.all([
    supabase.from('families').select(COLS).in('lifecycle_stage', ['trial', 'active', 'paused', 'lost']).limit(600),
    supabase.from('families').select(COLS).eq('lifecycle_stage', 'lead').order('created_at', { ascending: false }).limit(80),
    supabase.from('families').select('id', { count: 'exact', head: true }).eq('lifecycle_stage', 'lead'),
  ])

  const families = [...((recentLeads ?? []) as PFamily[]), ...((others ?? []) as PFamily[])]

  return (
    <DashboardShell user={user} currentPath="/leads" pageTitle="Leads & Pipeline" pageSubtitle="Drag families across the pipeline — from new lead all the way to active member.">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-800 mb-4">
        💡 <strong>Drag a card</strong> from one column to the next to move them along — it saves automatically. Click a name to open their full profile.
      </div>
      <LeadPipeline families={families} leadTotal={leadTotal ?? 0} />
    </DashboardShell>
  )
}
