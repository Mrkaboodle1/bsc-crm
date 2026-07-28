-- ============================================================================
-- BSC CRM — Migration 026: Play On Vouchers (QLD voucher tracker)
-- ============================================================================
-- Tracks each $200 Play On (FairPlay) voucher a family redeems at Big Star.
-- $200 = $20/wk x 10 weeks = one term (gov-funded). The CRM tracks the term,
-- flags when it's ending, and prompts conversion to the paid subscription.
-- The actual redemption happens on the QLD gov portal; this is the record.
-- Safe to run as-is (idempotent).
-- ============================================================================

CREATE TABLE IF NOT EXISTS play_on_vouchers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  family_id       UUID REFERENCES families(id) ON DELETE SET NULL,
  family_name     TEXT,                 -- display (free text or from family)
  student_name    TEXT,                 -- the child the voucher is for
  voucher_ref     TEXT,                 -- voucher code / reference
  amount          NUMERIC(10,2) NOT NULL DEFAULT 200,
  weekly_value    NUMERIC(10,2) NOT NULL DEFAULT 20,
  weeks           INT NOT NULL DEFAULT 10,
  redeemed_on     DATE,
  term_start      DATE,
  term_end        DATE,                 -- redeemed_on + 10 weeks
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','converted','expired')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_tenant ON play_on_vouchers(tenant_id, status, term_end);

ALTER TABLE play_on_vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vouchers_staff ON play_on_vouchers;
CREATE POLICY vouchers_staff ON play_on_vouchers FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
         AND coalesce((SELECT role FROM public.users WHERE id = auth.uid()),'') IN ('owner','manager','coach','support'))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS vouchers_updated_at ON play_on_vouchers;
CREATE TRIGGER vouchers_updated_at
  BEFORE UPDATE ON play_on_vouchers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
