import { verifySession } from '@/lib/dal'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { DashboardShell } from '@/components/dashboard-shell'
import { CampaignsClient, type Campaign } from '@/components/campaigns-client'

export const dynamic = 'force-dynamic'

const SETUP_SQL = `-- Run this once in the Supabase SQL editor, then refresh.
-- (Full file: schema/025_campaigns.sql)
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  channel text not null default 'email' check (channel in ('email','sms','social')),
  title text not null, month text, subject text,
  content jsonb not null default '{}'::jsonb, image_url text,
  status text not null default 'draft' check (status in ('draft','scheduled','sent','archived')),
  scheduled_for timestamptz, sort int default 0,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table campaigns enable row level security;
drop policy if exists campaigns_staff on campaigns;
create policy campaigns_staff on campaigns for all to authenticated
  using (tenant_id = (select tenant_id from public.users where id = auth.uid()))
  with check (tenant_id = (select tenant_id from public.users where id = auth.uid()));`

export default async function CampaignsPage() {
  const user = await verifySession()
  const admin = createAdminSupabase()

  let campaigns: Campaign[] = []
  let setupNeeded = false
  const { data, error } = await admin.from('campaigns').select('*').eq('tenant_id', user.tenantId).order('month').order('sort')
  if (error) setupNeeded = true
  else campaigns = (data ?? []) as Campaign[]

  const t = (user as unknown as { tenant?: Record<string, unknown> }).tenant ?? {}
  const branding = {
    name: (t.name as string) || 'Big Star Circus',
    logoUrl: '/marketing/logo.png',
    primary: (t.primary_color as string) || '#D72027',
    accent: (t.accent_color as string) || '#F5A623',
    phone: (t.phone as string) || '0489 188 179',
    website: (t.website as string) || 'bigstarcircus.com.au',
  }
  const images = ['/marketing/canva-header1.png', '/marketing/canva-header2.png', '/marketing/canva-newsletter.png', '/marketing/logo.png', '/marketing/lights.jpg', '/marketing/plate.jpg', '/marketing/group.jpg', '/marketing/free-trial-qr.png']

  return (
    <DashboardShell user={user} currentPath="/marketing/campaigns" pageTitle="Campaigns" pageSubtitle="Your editable home for every newsletter, text & social post — edit, schedule, post.">
      <CampaignsClient initial={campaigns} branding={branding} images={images} setupNeeded={setupNeeded} setupSql={SETUP_SQL} />
    </DashboardShell>
  )
}
