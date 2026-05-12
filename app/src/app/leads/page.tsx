import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { LeadsKanban, type Lead } from '@/components/leads-kanban'

export default async function LeadsPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const { data, error } = await supabase
    .from('families')
    .select('id, family_name, primary_parent, email, phone, source, lifecycle_stage, created_at, notes, tags')
    .in('lifecycle_stage', ['lead', 'trial'])
    .order('created_at', { ascending: false })

  const leads: Lead[] = (data ?? []).map((f) => ({
    id: f.id,
    name: f.family_name,
    parent: f.primary_parent,
    email: f.email,
    phone: f.phone,
    source: f.source,
    stage: f.lifecycle_stage === 'trial' ? 'trial_booked' : 'new',
    createdAt: f.created_at,
    notes: f.notes,
    tags: f.tags ?? [],
  }))

  return (
    <DashboardShell
      user={user}
      currentPath="/leads"
      pageTitle="Leads"
      pageSubtitle={`${leads.length} active leads & trials`}
    >
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl px-4 py-3 text-sm mb-4">
          {error.message}
        </div>
      )}
      <LeadsKanban leads={leads} />
    </DashboardShell>
  )
}
