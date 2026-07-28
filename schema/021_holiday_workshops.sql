-- ============================================================================
-- BSC CRM v1 — Migration 021: Holiday-workshop booking + capacity + waitlist
-- ============================================================================
-- Drafted: 2026-06-08 by Jacky.
--   holiday_workshops  — one row per workshop DAY (date, capacity, prices,
--                        member-priority window).
--   workshop_bookings  — a booking (member or new lead), booked or waitlisted.
-- Members book first (before public_opens_at); the public books the remainder;
-- when a day is full, bookings auto-go to the waitlist. New (non-member) bookers
-- are captured as leads. Tenant-scoped; API routes use the service role.
-- Run order: after 020. Safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.holiday_workshops (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  date            date not null,
  title           text not null default 'School Holiday Workshop',
  start_time      time not null default '09:00',
  end_time        time not null default '15:00',
  capacity        int  not null default 24,
  member_price    numeric(10,2) not null default 30,
  public_price    numeric(10,2) not null default 60,
  public_opens_at date,                 -- members-only until this date; NULL = open to all now
  status          text not null default 'open' check (status in ('open','closed','cancelled')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS holiday_workshops_tenant_date ON public.holiday_workshops (tenant_id, date);

CREATE TABLE IF NOT EXISTS public.workshop_bookings (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  workshop_id  uuid not null references public.holiday_workshops(id) on delete cascade,
  family_id    uuid references public.families(id) on delete set null,
  parent_name  text,
  email        text,
  phone        text,
  child_names  text,
  is_member    boolean not null default false,
  status       text not null default 'booked' check (status in ('booked','waitlist','cancelled')),
  source       text not null default 'public',
  notes        text,
  created_at   timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS workshop_bookings_workshop ON public.workshop_bookings (workshop_id, status);

ALTER TABLE public.holiday_workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS holiday_workshops_tenant ON public.holiday_workshops;
CREATE POLICY holiday_workshops_tenant ON public.holiday_workshops
  USING (tenant_id = current_tenant_id() AND coalesce((SELECT role FROM public.users WHERE id = auth.uid()), '') IN ('owner','manager','coach','support'));
DROP POLICY IF EXISTS workshop_bookings_tenant ON public.workshop_bookings;
CREATE POLICY workshop_bookings_tenant ON public.workshop_bookings
  USING (tenant_id = current_tenant_id() AND coalesce((SELECT role FROM public.users WHERE id = auth.uid()), '') IN ('owner','manager','coach','support'));
