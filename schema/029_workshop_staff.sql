-- ============================================================================
-- BSC CRM — Migration 029: Workshop / KNO staff roster
-- ============================================================================
-- Who's rostered on each holiday-workshop day (and each Kids Night Out).
-- Editable: assign / remove / switch coaches & trainees per day.
-- Safe to run as-is (idempotent).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workshop_staff (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  workshop_id  uuid not null references public.holiday_workshops(id) on delete cascade,
  coach_id     uuid references public.coaches(id) on delete set null,
  coach_name   text,                          -- denormalised for display
  role         text not null default 'coach'  check (role in ('coach','trainee','lead')),
  status       text not null default 'assigned' check (status in ('assigned','confirmed','declined','tentative')),
  created_at   timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS workshop_staff_ws ON public.workshop_staff (workshop_id);

ALTER TABLE public.workshop_staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workshop_staff_tenant ON public.workshop_staff;
CREATE POLICY workshop_staff_tenant ON public.workshop_staff FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()
         AND coalesce((SELECT role FROM public.users WHERE id = auth.uid()), '') IN ('owner','manager','coach','support'))
  WITH CHECK (tenant_id = current_tenant_id());
