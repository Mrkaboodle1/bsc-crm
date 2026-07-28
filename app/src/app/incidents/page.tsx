import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { IncidentsClient, type Incident } from '@/components/incidents-client'

export const dynamic = 'force-dynamic'

export default async function IncidentsPage() {
  const user = await verifySession()
  const admin = createAdminSupabase()
  const { data } = await admin.from('incident_reports')
    .select('id, report_no, workshop_id, occurred_on, occurred_at, location, report_type, severity, children, reporter_name, description, action_taken, injury_details, witnesses, parent_notified, parent_notified_details, media, eufy_evidence, status, created_by, created_at')
    .eq('tenant_id', user.tenantId).order('occurred_on', { ascending: false }).order('created_at', { ascending: false })

  return (
    <DashboardShell user={user} currentPath="/incidents" pageTitle="🚑 Incident & Accident Reports" pageSubtitle="Log, record and print any incident, accident or injury">
      <style>{`@media print { .no-print { display: none !important; } .print-card { break-inside: avoid; border: 1px solid #ddd !important; } body { background: #fff; } }`}</style>
      <IncidentsClient initial={(data ?? []) as Incident[]} />
    </DashboardShell>
  )
}
