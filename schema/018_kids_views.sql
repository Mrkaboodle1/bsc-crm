-- ============================================================================
-- BSC CRM v1 — Migration 018: BigStar Kids integration views
-- ============================================================================
-- Drafted: 2026-06-08 by Jacky (for Stacy's Parent Portal / BigStar Kids)
-- Purpose: let the BigStar Kids app read the CRM's REAL data with no code
--   rewrite. Stacy's app expects tables named `kids` and `attendances`; the CRM
--   stores these as `students` and `attendance`. These read-only views bridge
--   the names. security_invoker = true means the underlying tables' RLS (tenant
--   isolation) still applies to whoever queries the view.
-- Run order: after 017. Safe to re-run.
-- ============================================================================

CREATE OR REPLACE VIEW public.kids WITH (security_invoker = true) AS
  SELECT * FROM public.students;

CREATE OR REPLACE VIEW public.attendances WITH (security_invoker = true) AS
  SELECT * FROM public.attendance;

-- Optional convenience: a parent-scoped view of their own children only.
-- A parent's auth.uid() → families.parent_user_id → students. Use this in the
-- parent portal so a signed-in parent only ever sees THEIR kids (the base
-- students RLS is tenant-wide, which is correct for staff but too broad for
-- parents — see the handoff note).
CREATE OR REPLACE VIEW public.my_kids WITH (security_invoker = true) AS
  SELECT s.*
  FROM public.students s
  JOIN public.families f ON f.id = s.family_id
  WHERE f.parent_user_id = auth.uid();

GRANT SELECT ON public.kids, public.attendances, public.my_kids TO authenticated;
