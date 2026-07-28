-- ============================================================================
-- BSC CRM — Migration 034: Coach replies (inbound email into the CRM)
-- ============================================================================
-- When a coach replies to a roster/notification email, the reply is captured
-- here so it shows inside the CRM (as well as forwarding to your inbox).
-- Safe to run as-is.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.coach_replies (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  coach_id     uuid references public.coaches(id) on delete set null,
  from_email   text,
  from_name    text,
  subject      text,
  body         text,
  is_read      boolean not null default false,
  received_at  timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS coach_replies_tenant ON public.coach_replies (tenant_id, received_at DESC);

ALTER TABLE public.coach_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS coach_replies_tenant ON public.coach_replies;
CREATE POLICY coach_replies_tenant ON public.coach_replies FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()
         AND coalesce((SELECT role FROM public.users WHERE id = auth.uid()), '') IN ('owner','manager'))
  WITH CHECK (tenant_id = current_tenant_id());
