import { notFound, redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { DashboardShell } from '@/components/dashboard-shell'
import { SuburbDetail } from '@/components/suburb-detail'

export const dynamic = 'force-dynamic'

export default async function SuburbPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await verifySession()
  if (!['owner', 'manager'].includes(user.role)) redirect('/dashboard')
  const admin = createAdminSupabase()

  const { data: suburb } = await admin.from('expansion_suburbs').select('*').eq('id', id).eq('tenant_id', user.tenantId).maybeSingle()
  if (!suburb) notFound()

  const [v, c, m, l, t] = await Promise.all([
    admin.from('expansion_venues').select('*').eq('suburb_id', id).order('score', { ascending: false, nullsFirst: false }),
    admin.from('expansion_competitors').select('*').eq('suburb_id', id).order('pressure_score', { ascending: false, nullsFirst: false }),
    admin.from('expansion_community').select('*').eq('suburb_id', id).order('usefulness', { ascending: false, nullsFirst: false }),
    admin.from('expansion_leads').select('*').eq('suburb_id', id).order('created_at', { ascending: false }),
    admin.from('expansion_tasks').select('*').eq('suburb_id', id).order('done').order('due_on', { nullsFirst: false }),
  ])

  return (
    <DashboardShell
      user={user}
      currentPath="/expansion"
      pageTitle={suburb.name}
      pageSubtitle={[suburb.region, suburb.postcode, suburb.lga].filter(Boolean).join(' · ') || 'Expansion target'}
      pageActions={<a href="/expansion" className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50">← Radar</a>}
    >
      <SuburbDetail
        suburb={suburb}
        venues={v.data ?? []}
        competitors={c.data ?? []}
        community={m.data ?? []}
        leads={l.data ?? []}
        tasks={t.data ?? []}
      />
    </DashboardShell>
  )
}
