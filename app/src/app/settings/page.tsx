import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { SettingsClient, type TenantProfile } from '@/components/settings-client'

export default async function SettingsPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, abn, email, phone, website, address, founded_year, primary_colour, accent_colour, logo_url, slug, plan')
    .eq('id', user.tenantId)
    .maybeSingle<TenantProfile>()

  return (
    <DashboardShell user={user} currentPath="/settings" pageTitle="Settings" pageSubtitle="Manage your business profile and platform settings">
      <SettingsClient tenant={tenant ?? { name: 'Big Star Circus', abn: null, email: null, phone: null, website: null, address: null, founded_year: null, primary_colour: '#D72027', accent_colour: '#FFC107', logo_url: null, slug: 'bigstarcircus', plan: 'founder' }} />
    </DashboardShell>
  )
}
