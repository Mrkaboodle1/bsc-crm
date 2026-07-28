import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { SettingsClient, type TenantProfile } from '@/components/settings-client'
import { ChangePassword } from '@/components/change-password'

export default async function SettingsPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, abn, email, phone, website, address, founded_year, primary_colour, accent_colour, logo_url, slug, plan, email_signature, settings')
    .eq('id', user.tenantId)
    .maybeSingle()

  const settings = (tenant?.settings ?? {}) as { profile?: { tagline?: string; mission?: string; headerLocation?: string; ownerName?: string; socials?: Record<string, string> } }
  const sp = settings.profile ?? {}
  const profile: TenantProfile = {
    name: tenant?.name ?? null, abn: tenant?.abn ?? null, email: tenant?.email ?? null, phone: tenant?.phone ?? null,
    website: tenant?.website ?? null, address: tenant?.address ?? null, founded_year: tenant?.founded_year ?? null,
    primary_colour: tenant?.primary_colour ?? '#D72027', accent_colour: tenant?.accent_colour ?? '#FFC107',
    logo_url: tenant?.logo_url ?? null, slug: tenant?.slug ?? null, plan: tenant?.plan ?? 'founder',
    email_signature: tenant?.email_signature ?? null,
    tagline: sp.tagline ?? null, mission: sp.mission ?? null,
    headerLocation: sp.headerLocation ?? null, ownerName: sp.ownerName ?? null,
    socials: { facebook: sp.socials?.facebook ?? '', instagram: sp.socials?.instagram ?? '', youtube: sp.socials?.youtube ?? '', tiktok: sp.socials?.tiktok ?? '' },
  }

  return (
    <DashboardShell user={user} currentPath="/settings" pageTitle="Settings" pageSubtitle="Manage your business profile and platform settings">
      <SettingsClient tenant={profile} />
      <div className="mt-6">
        <ChangePassword email={user.email} />
      </div>
    </DashboardShell>
  )
}
