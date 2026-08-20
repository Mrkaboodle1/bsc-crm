-- ============================================================================
-- BSC CRM — Migration 060: Coach & trainee time logs (clock in / clock out)
-- ============================================================================
-- Rhett pastes this into the Supabase SQL editor and runs it once.
--
-- What it does: every time a coach opens the coach portal on the iPad, the
-- app clocks them IN for the day (first open only). A "Clock off" button
-- closes the entry. Trainees (Charlie) get their own tap-in/tap-out tile on
-- the coach portal. Hours feed straight into payroll conversations.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.coach_time_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  coach_id     uuid REFERENCES public.coaches(id) ON DELETE SET NULL,
  user_id      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  person_name  text NOT NULL,                -- "Tiffany Buckley", "Charlie (trainee)"
  kind         text NOT NULL DEFAULT 'coach' CHECK (kind IN ('coach','trainee')),
  clock_in     timestamptz NOT NULL DEFAULT now(),
  clock_out    timestamptz,                  -- NULL = still clocked on
  source       text DEFAULT 'portal',        -- 'portal' | 'auto' | 'manual'
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_logs_tenant_day ON public.coach_time_logs (tenant_id, clock_in DESC);
CREATE INDEX IF NOT EXISTS idx_time_logs_coach ON public.coach_time_logs (coach_id, clock_in DESC);

ALTER TABLE public.coach_time_logs ENABLE ROW LEVEL SECURITY;

-- Coaches can see and write their own logs; owner/manager see everything.
DROP POLICY IF EXISTS time_logs_all ON public.coach_time_logs;
CREATE POLICY time_logs_all ON public.coach_time_logs FOR ALL TO authenticated
  USING (
    tenant_id = current_tenant_id()
    AND (
      coalesce((SELECT role FROM public.users WHERE id = auth.uid()), '') IN ('owner','manager')
      OR user_id = auth.uid()
      OR kind = 'trainee'   -- any signed-in coach can operate the trainee tile
    )
  )
  WITH CHECK (tenant_id = current_tenant_id());
