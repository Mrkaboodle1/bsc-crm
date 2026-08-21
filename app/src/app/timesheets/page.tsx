import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createServerSupabaseAdmin } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { TimesheetsClient, type LogRow, type CoachOption } from '@/components/timesheets-client'

// /timesheets — admin view of the coach time clock: fix a wrong clock-in,
// delete a ghost entry, add a forgotten shift. Feeds payroll, so admin only.

export default async function TimesheetsPage() {
  const user = await verifySession()
  if (!['owner', 'manager'].includes(user.role)) redirect('/roll-call')

  const admin = await createServerSupabaseAdmin()
  const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString()

  const [{ data: logs }, { data: coaches }] = await Promise.all([
    admin.from('coach_time_logs')
      .select('id, coach_id, person_name, kind, source, clock_in, clock_out')
      .eq('tenant_id', user.tenantId).gte('clock_in', since)
      .order('clock_in', { ascending: false }),
    admin.from('coaches').select('id, full_name, role')
      .eq('tenant_id', user.tenantId).eq('status', 'active').order('full_name'),
  ])

  return (
    <DashboardShell
      user={user}
      currentPath="/timesheets"
      pageTitle="Timesheets"
      pageSubtitle="The coach time clock, last 14 days — fix times, remove mistakes, add forgotten shifts."
    >
      <TimesheetsClient
        logs={(logs ?? []) as LogRow[]}
        coaches={(coaches ?? []) as CoachOption[]}
      />
    </DashboardShell>
  )
}
