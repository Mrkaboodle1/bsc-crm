-- ============================================================================
-- BSC CRM v1 — Migration 023: Trainee logbook + pathway level
-- ============================================================================
-- Drafted: 2026-06-08 by Jacky. Digital version of Rhett's Canva trainee
-- booklet: each trainee logs coaching hours (with coach sign-off), and we track
-- their pathway level + goals. Run after 022. Safe to re-run.
-- ============================================================================

ALTER TABLE coaches ADD COLUMN IF NOT EXISTS trainee_level TEXT;   -- trainee_trainer / junior_trainer / assistant_trainer / trainer
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS trainee_goals TEXT;

CREATE TABLE IF NOT EXISTS public.trainee_logbook (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  coach_id      uuid not null references public.coaches(id) on delete cascade,  -- the trainee
  entry_date    date not null,
  time_in       time,
  time_out      time,
  hours         numeric(5,2) not null default 0,
  activity      text,                       -- what they coached / did
  signed_off    boolean not null default false,
  signed_off_by uuid references public.coaches(id) on delete set null,
  created_at    timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS trainee_logbook_coach ON public.trainee_logbook (coach_id, entry_date);

ALTER TABLE public.trainee_logbook ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS trainee_logbook_tenant ON public.trainee_logbook;
CREATE POLICY trainee_logbook_tenant ON public.trainee_logbook
  USING (tenant_id = current_tenant_id() AND coalesce((SELECT role FROM public.users WHERE id = auth.uid()), '') IN ('owner','manager','coach','support'));
