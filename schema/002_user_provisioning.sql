-- ============================================================================
-- BSC CRM v1 — Migration 002: User Provisioning
-- ============================================================================
-- Drafted: 2026-05-12 by Jackie
-- Purpose: When a new auth.users row appears (someone magic-link signed in for
--          the first time), auto-create a public.users row IF this is the first
--          user of the BSC tenant. They become owner.
--
--          Subsequent users must be added to public.users manually (or via
--          invite flow built in Slice 5). This stops anyone-with-the-URL from
--          self-onboarding.
--
--          Also provides a SECURITY DEFINER helper for the invite flow.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bsc_tenant_id UUID;
  existing_user_count INT;
BEGIN
  SELECT id INTO bsc_tenant_id FROM public.tenants WHERE slug = 'bigstarcircus';

  IF bsc_tenant_id IS NULL THEN
    RETURN NEW; -- No tenant yet; bail safely.
  END IF;

  -- Is this the very first user for BSC? If yes, they're the founder (owner).
  SELECT COUNT(*) INTO existing_user_count
  FROM public.users WHERE tenant_id = bsc_tenant_id;

  IF existing_user_count = 0 THEN
    INSERT INTO public.users (id, tenant_id, email, role, full_name)
    VALUES (
      NEW.id,
      bsc_tenant_id,
      NEW.email,
      'owner',
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- For 2nd+ users: do nothing. They authenticate with Supabase but have no
  -- public.users row, so RLS will return zero data. Dashboard handles this
  -- by showing an "awaiting access" message until an owner adds them.

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================================
-- Self-service helper for owners: invite a new user to your tenant
-- (Used by Slice 5 invite flow; safe to ship now.)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.invite_user_to_tenant(
  invitee_auth_id UUID,
  invitee_email TEXT,
  invitee_full_name TEXT,
  invitee_role TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_tenant UUID;
  caller_role TEXT;
  new_user_id UUID;
BEGIN
  -- Only owners/managers of an existing tenant can invite.
  SELECT tenant_id, role INTO caller_tenant, caller_role
    FROM public.users WHERE id = auth.uid();

  IF caller_tenant IS NULL THEN
    RAISE EXCEPTION 'Caller has no tenant';
  END IF;

  IF caller_role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'Only owners or managers can invite users';
  END IF;

  IF invitee_role NOT IN ('owner', 'manager', 'coach', 'parent', 'support') THEN
    RAISE EXCEPTION 'Invalid role: %', invitee_role;
  END IF;

  INSERT INTO public.users (id, tenant_id, email, role, full_name)
  VALUES (invitee_auth_id, caller_tenant, invitee_email, invitee_role, invitee_full_name)
  ON CONFLICT (id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        email     = EXCLUDED.email,
        role      = EXCLUDED.role,
        full_name = EXCLUDED.full_name
  RETURNING id INTO new_user_id;

  RETURN new_user_id;
END;
$$;

-- ============================================================================
-- End of migration 002
-- ============================================================================
