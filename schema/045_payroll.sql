-- ============================================================================
-- BSC CRM — Migration 045: Big Star Books Phase 2 — payroll & super
-- ============================================================================
-- people you pay (contractors / employees / owner), fortnightly pay runs, and
-- per-person pay items with auto 12% super + "paid" tracking. Owner/manager only.
-- ============================================================================

create table if not exists public.payroll_people (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  name          text not null,
  kind          text not null default 'contractor' check (kind in ('contractor','employee','owner')),
  super_applies boolean not null default true,
  super_rate    numeric(5,2) not null default 12,        -- %
  default_amount numeric(12,2) default 0,                -- usual gross per pay
  abn           text,
  super_fund    text,
  active        boolean not null default true,
  notes         text,
  created_at    timestamptz not null default now()
);
create index if not exists payroll_people_tenant on public.payroll_people (tenant_id);

create table if not exists public.pay_runs (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  pay_date     date not null,
  period_start date,
  period_end   date,
  super_due    date,                                     -- pay super by here (Payday Super)
  status       text not null default 'open' check (status in ('open','paid')),
  created_at   timestamptz not null default now()
);
create index if not exists pay_runs_tenant on public.pay_runs (tenant_id, pay_date desc);

create table if not exists public.pay_items (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  pay_run_id  uuid not null references public.pay_runs(id) on delete cascade,
  person_id   uuid references public.payroll_people(id) on delete set null,
  name        text,                                      -- snapshot of who
  gross       numeric(12,2) not null default 0,
  super       numeric(12,2) not null default 0,
  wage_paid   boolean not null default false,
  super_paid  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists pay_items_run on public.pay_items (pay_run_id);

alter table public.payroll_people enable row level security;
alter table public.pay_runs enable row level security;
alter table public.pay_items enable row level security;
drop policy if exists payroll_people_t on public.payroll_people;
drop policy if exists pay_runs_t on public.pay_runs;
drop policy if exists pay_items_t on public.pay_items;
create policy payroll_people_t on public.payroll_people for all to authenticated
  using (tenant_id = current_tenant_id() and coalesce((select role from public.users where id = auth.uid()),'') in ('owner','manager')) with check (tenant_id = current_tenant_id());
create policy pay_runs_t on public.pay_runs for all to authenticated
  using (tenant_id = current_tenant_id() and coalesce((select role from public.users where id = auth.uid()),'') in ('owner','manager')) with check (tenant_id = current_tenant_id());
create policy pay_items_t on public.pay_items for all to authenticated
  using (tenant_id = current_tenant_id() and coalesce((select role from public.users where id = auth.uid()),'') in ('owner','manager')) with check (tenant_id = current_tenant_id());
