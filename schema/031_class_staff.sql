-- ============================================================================
-- BSC CRM — Migration 031: Class staff roster (coaches & trainees per class)
-- ============================================================================
-- Lets you roster multiple coaches/trainees onto regular weekly classes, the
-- same way workshop_staff works for holiday workshops & Kids Night Out.
-- Safe to run as-is (idempotent).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.class_staff (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  class_id    uuid not null references public.classes(id) on delete cascade,
  coach_id    uuid references public.coaches(id) on delete set null,
  coach_name  text,
  role        text not null default 'coach' check (role in ('coach','trainee','lead')),
  created_at  timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS class_staff_class ON public.class_staff (class_id);

ALTER TABLE public.class_staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS class_staff_tenant ON public.class_staff;
CREATE POLICY class_staff_tenant ON public.class_staff FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()
         AND coalesce((SELECT role FROM public.users WHERE id = auth.uid()), '') IN ('owner','manager','coach','support'))
  WITH CHECK (tenant_id = current_tenant_id());
