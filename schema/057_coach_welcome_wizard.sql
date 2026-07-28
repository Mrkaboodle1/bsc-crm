-- 057_coach_welcome_wizard.sql
-- Editable "welcome pages" a new coach reads during sign-up (Rhett edits them in
-- the CRM → the coach sees them), plus a record of their signed agreement.
-- Paste this whole file into the Supabase SQL editor and Run.

CREATE TABLE IF NOT EXISTS coach_welcome_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sort        INT NOT NULL DEFAULT 0,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_welcome_sections_tenant ON coach_welcome_sections(tenant_id, sort);
ALTER TABLE coach_welcome_sections ENABLE ROW LEVEL SECURITY;  -- service-role only

ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS agreement_name       TEXT,
  ADD COLUMN IF NOT EXISTS agreement_signed_at  TIMESTAMPTZ;
