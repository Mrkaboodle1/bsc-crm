-- ============================================================================
-- BSC CRM — Migration 015: Form Builder
-- ============================================================================
-- Stores custom forms Rhett builds in the CRM. Each form has a public slug so
-- it can be shared / embedded on bigstarcircus.com.au. Submissions still flow
-- through /api/forms/submit (creating contacts + Chat notes) — this table only
-- holds the form *definitions* (their fields).
-- Safe to run as-is (idempotent).
-- ============================================================================

CREATE TABLE IF NOT EXISTS forms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  intro       TEXT,
  fields      JSONB NOT NULL DEFAULT '[]'::jsonb,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_forms_tenant ON forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_forms_slug ON forms(slug);

DROP TRIGGER IF EXISTS forms_updated_at ON forms;
CREATE TRIGGER forms_updated_at BEFORE UPDATE ON forms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_forms ON forms;
CREATE POLICY tenant_isolation_forms ON forms USING (tenant_id = current_tenant_id());

-- ============================================================================
-- End of migration 015
-- ============================================================================
