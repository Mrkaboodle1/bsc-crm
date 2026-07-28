-- 056_interview_log.sql
-- Digital interview logging — fill in on the iPad, save every interview, review
-- past ones. Editable question templates per role type (coach / admin / volunteer…).
-- Paste this whole file into the Supabase SQL editor and Run.

-- Reusable question sets (Coach, Admin, Volunteer, or any custom type) ---------
CREATE TABLE IF NOT EXISTS interview_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  questions   JSONB NOT NULL DEFAULT '[]'::jsonb,   -- ["Why do you coach children?", ...]
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE interview_templates ENABLE ROW LEVEL SECURITY;  -- service-role only

-- One saved interview log -----------------------------------------------------
CREATE TABLE IF NOT EXISTS interviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  candidate_name  TEXT NOT NULL,
  role_type       TEXT,                                  -- "Coach", "Admin", "Volunteer"…
  interview_date  DATE,
  start_time      TEXT,                                  -- "9:15am"
  interviewer     TEXT,
  items           JSONB NOT NULL DEFAULT '[]'::jsonb,    -- [{q, answer, score}]
  decision        TEXT,                                  -- "hire" | "trial" | "pass" | free text
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','completed')),
  created_by      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_interviews_tenant ON interviews(tenant_id, interview_date DESC, created_at DESC);
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;  -- service-role only
