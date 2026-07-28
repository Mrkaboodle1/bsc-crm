-- ============================================================================
-- BSC CRM — Migration 044: risk assessments (editable + printable)
-- ============================================================================
-- One record per activity type (Circus, Aerial, Gymnastics, School Holiday,
-- KNO, General Classes, OSHC, Circus Show). Content is editable; print to PDF
-- from the browser. Owner/manager only.
-- ============================================================================

create table if not exists public.risk_assessments (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  title         text not null,
  activity_type text,
  content       jsonb not null default '{}'::jsonb,   -- { location, assessor, date, review_date, description, hazards:[{hazard,who,risk,controls}] }
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index if not exists risk_assessments_tenant on public.risk_assessments (tenant_id);

alter table public.risk_assessments enable row level security;
drop policy if exists risk_assessments_tenant on public.risk_assessments;
create policy risk_assessments_tenant on public.risk_assessments for all to authenticated
  using (tenant_id = current_tenant_id()
         and coalesce((select role from public.users where id = auth.uid()), '') in ('owner','manager'))
  with check (tenant_id = current_tenant_id());
