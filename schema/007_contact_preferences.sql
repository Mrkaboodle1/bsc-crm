-- Migration 007 — Contact communication preferences (DND opt-outs)
--
-- Adds per-contact "do not disturb" toggles so Jacky's send pipeline
-- can refuse to email/SMS a contact who's opted out, regardless of
-- whether a draft was approved.
--
-- Apply once: paste into Supabase SQL editor.

ALTER TABLE families
  ADD COLUMN IF NOT EXISTS dnd_email   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dnd_sms     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dnd_calls   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dnd_all     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dnd_set_at  TIMESTAMPTZ;

-- Convenience index for the send pipeline (so a query like
-- "WHERE id = X AND (dnd_email OR dnd_all)" stays fast).
CREATE INDEX IF NOT EXISTS idx_families_dnd ON families(tenant_id) WHERE dnd_email OR dnd_sms OR dnd_calls OR dnd_all;

COMMENT ON COLUMN families.dnd_email IS 'Skip every outbound email to this contact, even after approval.';
COMMENT ON COLUMN families.dnd_sms   IS 'Skip every outbound SMS to this contact, even after approval.';
COMMENT ON COLUMN families.dnd_calls IS 'Reserved — no automated calls yet, but enforced when we add them.';
COMMENT ON COLUMN families.dnd_all   IS 'Master switch — when TRUE, every channel is suppressed.';
