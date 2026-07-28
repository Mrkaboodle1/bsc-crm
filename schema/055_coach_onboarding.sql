-- 055_coach_onboarding.sql
-- New-coach self-serve sign-up link + per-document credentials with expiry
-- reminders. Paste this whole file into the Supabase SQL editor and Run.
-- NOTE: We deliberately DO NOT store Tax File Numbers here (privacy/legal).

-- 1. Extra details we collect on the coach record at sign-up ------------------
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS date_of_birth        DATE,
  ADD COLUMN IF NOT EXISTS address              TEXT,
  ADD COLUMN IF NOT EXISTS abn                  TEXT,
  ADD COLUMN IF NOT EXISTS super_fund_name      TEXT,
  ADD COLUMN IF NOT EXISTS super_member_number  TEXT,
  ADD COLUMN IF NOT EXISTS super_fund_abn       TEXT,
  ADD COLUMN IF NOT EXISTS super_fund_usi       TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name    TEXT,
  ADD COLUMN IF NOT EXISTS bank_bsb             TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number  TEXT,
  ADD COLUMN IF NOT EXISTS public_liability_expiry DATE,
  ADD COLUMN IF NOT EXISTS drivers_licence_expiry  DATE;

-- 2. Every uploaded credential/document, with its own expiry + reminder state -
CREATE TABLE IF NOT EXISTS coach_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  coach_id          UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  doc_type          TEXT NOT NULL,   -- blue_card | public_liability | drivers_licence | gymnastics | first_aid | other
  label             TEXT,            -- free text for "other"
  file_path         TEXT,            -- path in the coach-credentials bucket
  issued_on         DATE,
  expiry_on         DATE,
  reminder_sent_on  DATE,            -- so we only email the 2-week reminder once
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coach_documents_coach  ON coach_documents(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_documents_expiry ON coach_documents(tenant_id, expiry_on);
ALTER TABLE coach_documents ENABLE ROW LEVEL SECURITY;  -- service-role only, like the rest

-- 3. The shareable sign-up links --------------------------------------------
CREATE TABLE IF NOT EXISTS coach_invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,
  created_by    TEXT,
  coach_id      UUID REFERENCES coaches(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  submitted_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_coach_invites_token ON coach_invites(token);
ALTER TABLE coach_invites ENABLE ROW LEVEL SECURITY;  -- service-role only
