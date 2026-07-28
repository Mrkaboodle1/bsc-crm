-- ============================================================================
-- BSC CRM v1 — Migration 020: Parent access hardening + kids access requests
-- ============================================================================
-- Drafted: 2026-06-08 by Jacky. Makes the parent portal safe:
--   • New parent signups (intended_role='parent' in signup metadata) get the
--     'parent' role, NOT 'coach'.
--   • Sensitive tables (families, students, attendance, star_ledger,
--     starband_sessions) now restrict the tenant-wide policy to STAFF roles,
--     and add a parent policy so a parent reads ONLY their own family/kids.
--   • bsc_tenant_id() helper for app writes.
--   • kids_access_requests — the "contact Big Star" no-match intake (never
--     auto-creates a family).
-- Staff (owner/manager/coach/support) access is unchanged. Service role bypasses
-- RLS as before. Run order: after 019. Safe to re-run.
-- ============================================================================

-- §1 — helper
CREATE OR REPLACE FUNCTION public.bsc_tenant_id() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT id FROM public.tenants WHERE slug = 'bigstarcircus' LIMIT 1 $$;

-- §2 — parent-aware signup provisioning
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t_id UUID;
  existing_count INT;
  new_role TEXT;
  intended TEXT;
BEGIN
  SELECT id INTO t_id FROM public.tenants WHERE slug = 'bigstarcircus';
  IF t_id IS NULL THEN RETURN NEW; END IF;

  intended := NEW.raw_user_meta_data->>'intended_role';
  IF intended = 'parent' THEN
    new_role := 'parent';
  ELSE
    SELECT COUNT(*) INTO existing_count FROM public.users WHERE tenant_id = t_id;
    IF existing_count = 0 THEN new_role := 'owner'; ELSE new_role := 'coach'; END IF;
  END IF;

  INSERT INTO public.users (id, tenant_id, email, role, full_name)
  VALUES (NEW.id, t_id, NEW.email, new_role,
          COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- §3 — staff-gate the tenant policies + add parent-scoped read policies
DO $$
DECLARE staff TEXT := $g$coalesce((SELECT role FROM public.users WHERE id = auth.uid()), '') IN ('owner','manager','coach','support')$g$;
BEGIN
  -- families
  DROP POLICY IF EXISTS tenant_isolation_families ON public.families;
  EXECUTE 'CREATE POLICY tenant_isolation_families ON public.families USING (tenant_id = current_tenant_id() AND ' || staff || ')';
  DROP POLICY IF EXISTS families_parent_read ON public.families;
  CREATE POLICY families_parent_read ON public.families FOR SELECT TO authenticated USING (parent_user_id = auth.uid());

  -- students
  DROP POLICY IF EXISTS tenant_isolation_students ON public.students;
  EXECUTE 'CREATE POLICY tenant_isolation_students ON public.students USING (tenant_id = current_tenant_id() AND ' || staff || ')';
  DROP POLICY IF EXISTS students_parent_read ON public.students;
  CREATE POLICY students_parent_read ON public.students FOR SELECT TO authenticated USING (family_id IN (SELECT id FROM public.families WHERE parent_user_id = auth.uid()));

  -- attendance
  DROP POLICY IF EXISTS tenant_isolation_attendance ON public.attendance;
  EXECUTE 'CREATE POLICY tenant_isolation_attendance ON public.attendance USING (tenant_id = current_tenant_id() AND ' || staff || ')';
  DROP POLICY IF EXISTS attendance_parent_read ON public.attendance;
  CREATE POLICY attendance_parent_read ON public.attendance FOR SELECT TO authenticated USING (student_id IN (SELECT s.id FROM public.students s JOIN public.families f ON f.id = s.family_id WHERE f.parent_user_id = auth.uid()));

  -- star_ledger
  DROP POLICY IF EXISTS tenant_isolation_star_ledger ON public.star_ledger;
  EXECUTE 'CREATE POLICY tenant_isolation_star_ledger ON public.star_ledger USING (tenant_id = current_tenant_id() AND ' || staff || ')';
  DROP POLICY IF EXISTS star_ledger_parent_read ON public.star_ledger;
  CREATE POLICY star_ledger_parent_read ON public.star_ledger FOR SELECT TO authenticated USING (student_id IN (SELECT s.id FROM public.students s JOIN public.families f ON f.id = s.family_id WHERE f.parent_user_id = auth.uid()));

  -- starband_sessions
  DROP POLICY IF EXISTS starband_sessions_tenant_read ON public.starband_sessions;
  EXECUTE 'CREATE POLICY starband_sessions_tenant_read ON public.starband_sessions FOR SELECT TO authenticated USING (tenant_id = current_tenant_id() AND ' || staff || ')';
  DROP POLICY IF EXISTS starband_sessions_parent_read ON public.starband_sessions;
  CREATE POLICY starband_sessions_parent_read ON public.starband_sessions FOR SELECT TO authenticated USING (student_id IN (SELECT s.id FROM public.students s JOIN public.families f ON f.id = s.family_id WHERE f.parent_user_id = auth.uid()));
END $$;

-- §4 — access-request intake (no-match onboarding; never creates a family)
CREATE TABLE IF NOT EXISTS public.kids_access_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  auth_user_id uuid,
  parent_name text,
  email text,
  phone text,
  kids_info text,
  message text,
  status text not null default 'new' check (status in ('new','contacted','linked','dismissed')),
  created_at timestamptz not null default now()
);
ALTER TABLE public.kids_access_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kids_access_requests_tenant ON public.kids_access_requests;
CREATE POLICY kids_access_requests_tenant ON public.kids_access_requests
  USING (tenant_id = current_tenant_id() AND coalesce((SELECT role FROM public.users WHERE id = auth.uid()), '') IN ('owner','manager','coach','support'));
