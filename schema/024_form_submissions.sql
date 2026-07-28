-- ============================================================================
-- BSC CRM v1 — Migration 024: Structured form submissions (for analytics)
-- ============================================================================
-- Drafted: 2026-06-08 by Jacky. Stores the full per-question answers for each
-- form submission so we can show results/analytics (tallies, "overall choice").
-- Lead-gen forms still create a family + inbox note as before; this adds the
-- structured record. Run after 023. Safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.form_submissions (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  form_id     uuid references public.forms(id) on delete cascade,
  form_slug   text,
  name        text,
  email       text,
  phone       text,
  answers     jsonb not null default '[]'::jsonb,   -- [{label, value, type}]
  created_at  timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS form_submissions_form ON public.form_submissions (form_id, created_at);
CREATE INDEX IF NOT EXISTS form_submissions_tenant ON public.form_submissions (tenant_id, created_at);

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS form_submissions_tenant ON public.form_submissions;
CREATE POLICY form_submissions_tenant ON public.form_submissions
  USING (tenant_id = current_tenant_id());
