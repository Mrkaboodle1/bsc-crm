import { verifySession } from '@/lib/dal'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { DashboardShell } from '@/components/dashboard-shell'
import { VouchersClient, type Voucher } from '@/components/vouchers-client'
import { attachVoucherClasses } from '@/lib/voucher-classes'

export const dynamic = 'force-dynamic'

const SETUP_SQL = `-- Run once in the Supabase SQL editor, then refresh.
-- (Full file: schema/026_play_on_vouchers.sql)
create table if not exists play_on_vouchers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  family_id uuid references families(id) on delete set null,
  family_name text, student_name text, voucher_ref text,
  amount numeric(10,2) not null default 200,
  weekly_value numeric(10,2) not null default 20,
  weeks int not null default 10,
  redeemed_on date, term_start date, term_end date,
  status text not null default 'active' check (status in ('active','converted','expired')),
  notes text, created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table play_on_vouchers add column if not exists use_type text check (use_type in ('term','workshop','both','unused'));
alter table play_on_vouchers add column if not exists photo_url text;
alter table play_on_vouchers enable row level security;
drop policy if exists vouchers_staff on play_on_vouchers;
create policy vouchers_staff on play_on_vouchers for all to authenticated
  using (tenant_id = (select tenant_id from public.users where id = auth.uid()))
  with check (tenant_id = (select tenant_id from public.users where id = auth.uid()));`

const DAY: Record<string, string> = { '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat' }

export default async function VouchersPage() {
  const user = await verifySession()
  const admin = createAdminSupabase()
  let vouchers: Voucher[] = []
  let setupNeeded = false
  const { data, error } = await admin.from('play_on_vouchers').select('*').eq('tenant_id', user.tenantId).order('term_end')
  if (error) setupNeeded = true
  else vouchers = await attachVoucherClasses(admin, user.tenantId, (data ?? []) as Voucher[])

  // Active classes for the "which class are they attending?" picker — labelled
  // with day + time so a mum's "Friday aerial" is easy to spot.
  const { data: cls } = await admin.from('classes').select('id, name, day_of_week, start_time')
    .eq('tenant_id', user.tenantId).eq('status', 'active').order('name')
  const classOptions = (cls ?? []).map((k) => {
    const day = k.day_of_week != null ? (DAY[String(k.day_of_week)] ?? String(k.day_of_week)) : null
    const time = k.start_time ? String(k.start_time).slice(0, 5) : null
    return { id: k.id as string, label: [k.name, [day, time].filter(Boolean).join(' ')].filter(Boolean).join(' — ') }
  })

  return (
    <DashboardShell user={user} currentPath="/finance/vouchers" pageTitle="Play On Vouchers" pageSubtitle="Track every $200 government voucher — and convert them to paying members.">
      <VouchersClient initial={vouchers} setupNeeded={setupNeeded} setupSql={SETUP_SQL} classOptions={classOptions} />
    </DashboardShell>
  )
}
