import { verifySession } from '@/lib/dal'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { DashboardShell } from '@/components/dashboard-shell'
import { DEFAULT_WAIVER, type Waiver } from '@/lib/waivers'
import { WaiverEditor } from '@/components/waiver-editor'

export const dynamic = 'force-dynamic'

export default async function WaiversPage() {
  const user = await verifySession()
  const admin = createAdminSupabase()
  const { data: t } = await admin.from('tenants').select('settings').eq('id', user.tenantId).maybeSingle()
  const saved = ((t?.settings as Record<string, unknown> | null)?.waiver || {}) as Partial<Waiver>
  const waiver: Waiver = { ...DEFAULT_WAIVER, ...saved }
  const canManage = ['owner', 'manager'].includes(user.role)

  return (
    <DashboardShell user={user} currentPath="/compliance/waivers" pageTitle="Waiver Forms" pageSubtitle="The liability, photo & medical wording parents agree to when they book. Edit it here — it updates every booking form.">
      <WaiverEditor initial={waiver} canManage={canManage} />
    </DashboardShell>
  )
}
