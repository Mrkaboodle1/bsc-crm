-- ============================================================================
-- BSC CRM — Migration 030: Paperless workshop attendance (Coach Portal)
-- ============================================================================
-- One row per child per workshop day. Coaches sign kids in/out, mark
-- present/absent, log incidents & notes — all digital, no paper sheets.
-- Auto-generated from workshop_bookings the first time a day is opened.
-- Safe to run as-is (idempotent).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workshop_attendance (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  workshop_id     uuid not null references public.holiday_workshops(id) on delete cascade,
  booking_id      uuid references public.workshop_bookings(id) on delete set null,
  child_name      text not null default 'Child',
  parent_name     text,
  parent_contact  text,                 -- email / phone for emergencies
  medical         text,                 -- allergies / medical alerts
  status          text not null default 'expected' check (status in ('expected','present','absent')),
  signed_in_at    timestamptz,
  signed_out_at   timestamptz,
  signed_out_to   text,
  incident        text,
  notes           text,
  created_at      timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS workshop_attendance_ws ON public.workshop_attendance (workshop_id);

ALTER TABLE public.workshop_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workshop_attendance_tenant ON public.workshop_attendance;
CREATE POLICY workshop_attendance_tenant ON public.workshop_attendance FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()
         AND coalesce((SELECT role FROM public.users WHERE id = auth.uid()), '') IN ('owner','manager','coach','support'))
  WITH CHECK (tenant_id = current_tenant_id());
