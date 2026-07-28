import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { RiskAssessmentsClient, type RA } from '@/components/risk-assessments-client'

export const dynamic = 'force-dynamic'

export default async function RiskAssessmentsPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.from('risk_assessments').select('id, title, activity_type, content, updated_at').eq('tenant_id', user.tenantId).order('title')
  const missing = !!error && (error.message.includes('does not exist') || error.message.includes('relation'))

  return (
    <DashboardShell
      user={user}
      currentPath="/compliance/risk-assessments"
      pageTitle="⚠️ Risk Assessments"
      pageSubtitle="Editable, printable risk assessments for every activity"
    >
      <div className="max-w-4xl">
        {missing ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
            This needs its database table first. Paste migration <strong>044_risk_assessments.sql</strong> into Supabase, then refresh.
          </div>
        ) : (
          <RiskAssessmentsClient initial={(data ?? []) as RA[]} businessName={user.tenant?.name || 'Big Star Circus'} />
        )}
      </div>
    </DashboardShell>
  )
}
