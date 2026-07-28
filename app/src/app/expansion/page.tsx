import { verifySession } from '@/lib/dal'
import { redirect } from 'next/navigation'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { DashboardShell } from '@/components/dashboard-shell'
import { RadarClient } from '@/components/radar-client'
import type { Suburb } from '@/lib/expansion'

export const dynamic = 'force-dynamic'

// BIGSTAR RADAR — where does the next BigStar open?
export default async function ExpansionPage() {
  const user = await verifySession()
  if (!['owner', 'manager'].includes(user.role)) redirect('/dashboard')
  const admin = createAdminSupabase()

  const { data, error } = await admin
    .from('expansion_suburbs')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('score', { ascending: false, nullsFirst: false })

  if (error) {
    return (
      <DashboardShell user={user} currentPath="/expansion" pageTitle="BigStar Radar" pageSubtitle="Where does the next BigStar open?">
        <div className="bg-white rounded-2xl border-2 border-amber-300 p-8 text-center max-w-xl mx-auto">
          <div className="text-4xl mb-2">📡</div>
          <h2 className="text-xl font-black text-zinc-900">One setup step needed</h2>
          <p className="text-zinc-600 mt-2">
            Open Supabase → SQL editor, paste <strong>schema/059_bigstar_radar.sql</strong> and hit <strong>Run</strong>.
            Then reload this page and the radar switches on — with Robina, Nerang and Coomera ready to seed.
          </p>
        </div>
      </DashboardShell>
    )
  }

  // Counts for the sub-tables, so each suburb card shows real progress
  const ids = (data ?? []).map((s) => s.id)
  const counts: Record<string, { venues: number; competitors: number; community: number; leads: number }> = {}
  for (const id of ids) counts[id] = { venues: 0, competitors: 0, community: 0, leads: 0 }
  if (ids.length) {
    const [v, c, m, l] = await Promise.all([
      admin.from('expansion_venues').select('suburb_id').in('suburb_id', ids),
      admin.from('expansion_competitors').select('suburb_id').in('suburb_id', ids),
      admin.from('expansion_community').select('suburb_id').in('suburb_id', ids),
      admin.from('expansion_leads').select('suburb_id').in('suburb_id', ids),
    ])
    for (const r of v.data ?? []) if (r.suburb_id && counts[r.suburb_id]) counts[r.suburb_id]!.venues++
    for (const r of c.data ?? []) if (r.suburb_id && counts[r.suburb_id]) counts[r.suburb_id]!.competitors++
    for (const r of m.data ?? []) if (r.suburb_id && counts[r.suburb_id]) counts[r.suburb_id]!.community++
    for (const r of l.data ?? []) if (r.suburb_id && counts[r.suburb_id]) counts[r.suburb_id]!.leads++
  }

  return (
    <DashboardShell
      user={user}
      currentPath="/expansion"
      pageTitle="BigStar Radar"
      pageSubtitle="Where does the next BigStar open? Hub-and-spoke: cheap community venues, coaches from HQ, feeding the flagship."
    >
      <RadarClient suburbs={(data ?? []) as unknown as Suburb[]} counts={counts} />
    </DashboardShell>
  )
}
