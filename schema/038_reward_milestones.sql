-- ============================================================================
-- BSC CRM — Migration 038: loyalty reward milestones
-- ============================================================================
-- Tracks when a child reaches an attendance milestone (10 / 20 / 40 classes in
-- a year) so staff get notified and can hand out the reward. Counts come from
-- the attendance roll automatically. Resets each calendar year (the `year` col).
-- Safe to run as-is.
-- ============================================================================

create table if not exists public.reward_milestones (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  milestone   int  not null,                 -- 10, 20, 40
  year        int  not null,
  status      text not null default 'reached' check (status in ('reached','given')),
  reached_at  timestamptz not null default now(),
  notified_at timestamptz,                    -- when the admin digest went out
  given_at    timestamptz,
  given_by    uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (student_id, milestone, year)
);
create index if not exists reward_milestones_tenant on public.reward_milestones (tenant_id, status);

alter table public.reward_milestones enable row level security;
drop policy if exists reward_milestones_tenant on public.reward_milestones;
create policy reward_milestones_tenant on public.reward_milestones for all to authenticated
  using (tenant_id = current_tenant_id()
         and coalesce((select role from public.users where id = auth.uid()), '') in ('owner','manager','coach','support'))
  with check (tenant_id = current_tenant_id());
