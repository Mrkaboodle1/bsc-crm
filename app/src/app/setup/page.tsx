import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { getProducts, getMembershipPlans } from '@/lib/pos'
import { SetupWizard } from '@/components/setup-wizard'

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  const user = await verifySession()
  if (!['owner', 'manager'].includes(user.role)) redirect('/dashboard')

  const supabase = await createServerSupabase()
  const { data: t } = await supabase
    .from('tenants')
    .select('name, phone, email, website, address, abn, logo_url, primary_colour, accent_colour, settings')
    .eq('id', user.tenantId).maybeSingle()

  const settings = (t?.settings ?? {}) as { profile?: { tagline?: string; mission?: string; socials?: Record<string, string> }; starband?: { auto_text?: boolean; default_mode?: string } }
  const sp = settings.profile ?? {}
  const products = await getProducts()
  const plans = await getMembershipPlans()

  return (
    <DashboardShell user={user} currentPath="/setup" pageTitle="Setup Wizard" pageSubtitle="Make this platform yours in a few minutes.">
      <SetupWizard
        tenant={{
          name: t?.name ?? null, phone: t?.phone ?? null, email: t?.email ?? null, website: t?.website ?? null,
          address: t?.address ?? null, abn: t?.abn ?? null, logo_url: t?.logo_url ?? null,
          primary_colour: t?.primary_colour ?? '#D72027', accent_colour: t?.accent_colour ?? '#FFC107',
          tagline: sp.tagline ?? null, mission: sp.mission ?? null,
          socials: { facebook: sp.socials?.facebook ?? '', instagram: sp.socials?.instagram ?? '', youtube: sp.socials?.youtube ?? '', tiktok: sp.socials?.tiktok ?? '' },
        }}
        starband={{ auto_text: !!settings.starband?.auto_text, default_mode: settings.starband?.default_mode ?? 'tap' }}
        productCount={products?.length ?? 0}
        planCount={plans?.length ?? 0}
      />
    </DashboardShell>
  )
}
