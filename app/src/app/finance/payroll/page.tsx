import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { PayrollClient, type Person } from '@/components/payroll-client'

export const dynamic = 'force-dynamic'

export default async function PayrollPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.from('payroll_people').select('*').eq('tenant_id', user.tenantId).order('name')
  const missing = !!error && (error.message.includes('does not exist') || error.message.includes('relation'))

  return (
    <DashboardShell user={user} currentPath="/finance/payroll" pageTitle="💸 Payroll & Super" pageSubtitle="Fortnightly pay runs with automatic 12% super and pay-by reminders">
      <div className="max-w-4xl">
        {missing ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
            This needs its database tables first. Paste migration <strong>045_payroll.sql</strong> into Supabase, then refresh.
          </div>
        ) : (
          <PayrollClient initialPeople={(data ?? []) as Person[]} />
        )}
      </div>
    </DashboardShell>
  )
}
