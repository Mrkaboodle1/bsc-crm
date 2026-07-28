-- ============================================================================
-- BSC CRM — Migration 036: Saved running-order templates
-- ============================================================================
-- Save a daily running order under a name (e.g. "Rodrigo's running order") and
-- re-use it on any workshop day in one tap. Items are stored inline as JSON.
-- Safe to run as-is (idempotent).
-- ============================================================================

create table if not exists public.workshop_order_templates (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  name       text not null,
  items      jsonb not null default '[]'::jsonb,   -- [{ time_label, activity }]
  created_at timestamptz not null default now()
);
create index if not exists workshop_order_templates_tenant on public.workshop_order_templates (tenant_id);

alter table public.workshop_order_templates enable row level security;
drop policy if exists workshop_order_templates_tenant on public.workshop_order_templates;
create policy workshop_order_templates_tenant on public.workshop_order_templates for all to authenticated
  using (tenant_id = current_tenant_id()
         and coalesce((select role from public.users where id = auth.uid()), '') in ('owner','manager','coach','support'))
  with check (tenant_id = current_tenant_id());
