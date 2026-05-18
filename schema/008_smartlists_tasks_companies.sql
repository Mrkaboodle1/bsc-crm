-- Migration 008 — Smart Lists, Tasks, Companies
--
-- Three new entities for the Contacts module to match Tectonic's structure.
-- Apply once via Supabase SQL editor.

-- ────────────────────────────────────────────────────────────────────
-- COMPANIES — B2B entities (schools, NDIS plan-managers, suppliers, etc.)
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS companies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  category      TEXT CHECK (category IN ('school', 'ndis_provider', 'supplier', 'partner', 'venue', 'other')),
  email         TEXT,
  phone         TEXT,
  website       TEXT,
  address       TEXT,
  city          TEXT,
  state         TEXT,
  postal_code   TEXT,
  country       TEXT DEFAULT 'Australia',
  description   TEXT,
  notes         TEXT,
  tags          TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_companies_tenant ON companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_companies_category ON companies(tenant_id, category);

-- Optional link: a family can belong to a company (e.g. NDIS plan-managed
-- family → their plan manager). Null = retail family.
ALTER TABLE families
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_families_company ON families(company_id) WHERE company_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────
-- TASKS — follow-up todo items, optionally linked to a contact (family)
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tasks (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT,
  status               TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'cancelled')),
  priority             TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  due_at               TIMESTAMPTZ,
  related_family_id    UUID REFERENCES families(id) ON DELETE SET NULL,
  related_student_id   UUID REFERENCES students(id) ON DELETE SET NULL,
  related_company_id   UUID REFERENCES companies(id) ON DELETE SET NULL,
  assigned_to_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at         TIMESTAMPTZ,
  completed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(tenant_id, status) WHERE status IN ('open', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_tasks_family ON tasks(related_family_id) WHERE related_family_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(tenant_id, due_at) WHERE status IN ('open', 'in_progress');

-- ────────────────────────────────────────────────────────────────────
-- SMART LISTS — saved filter sets shown as tabs above the contacts table
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS smart_lists (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  -- URL-style criteria: { q, stage, source, tag, dnd, payment_status, ... }
  criteria     JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order   INT NOT NULL DEFAULT 0,
  is_pinned    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_smart_lists_tenant ON smart_lists(tenant_id, sort_order);

-- ────────────────────────────────────────────────────────────────────
-- RLS — all three follow the existing tenant-scoped pattern
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE companies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_lists ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'companies_tenant_isolation') THEN
    CREATE POLICY companies_tenant_isolation ON companies USING (
      tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_tenant_isolation') THEN
    CREATE POLICY tasks_tenant_isolation ON tasks USING (
      tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'smart_lists' AND policyname = 'smart_lists_tenant_isolation') THEN
    CREATE POLICY smart_lists_tenant_isolation ON smart_lists USING (
      tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    );
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────
-- Seed a couple of useful BSC smart lists so the tabs aren't empty
-- ────────────────────────────────────────────────────────────────────

INSERT INTO smart_lists (tenant_id, name, criteria, sort_order, is_pinned)
SELECT t.id, x.name, x.criteria, x.sort_order, true
FROM tenants t,
LATERAL (VALUES
  ('All paying',     '{"stage": "active", "payment": "subscribed"}'::jsonb, 1),
  ('Trial families', '{"stage": "trial"}'::jsonb, 2),
  ('Open leads',     '{"stage": "lead"}'::jsonb, 3),
  ('Past / lapsed',  '{"stage": "past"}'::jsonb, 4)
) AS x(name, criteria, sort_order)
WHERE t.slug = 'bsc'
ON CONFLICT DO NOTHING;
