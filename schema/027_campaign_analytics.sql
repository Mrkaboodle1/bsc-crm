-- ============================================================================
-- BSC CRM — Migration 027: Campaign analytics (send tracking + open/click stats)
-- ============================================================================
-- One row per recipient per email campaign. Resend webhook updates the status
-- as emails are delivered / opened / clicked / bounced. The Campaigns results
-- page aggregates these into the Delivered/Opened/Clicked %s.
-- Safe to run as-is (idempotent).
-- ============================================================================

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS recipient_count INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS campaign_recipients (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id  UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  name         TEXT,
  resend_id    TEXT,                 -- the Resend message id (to match webhooks)
  status       TEXT NOT NULL DEFAULT 'sent' CHECK (status IN
                 ('sent','delivered','opened','clicked','bounced','complained','unsubscribed','failed')),
  opened_at    TIMESTAMPTZ,
  clicked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_camp_recip_campaign ON campaign_recipients(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_camp_recip_resend ON campaign_recipients(resend_id) WHERE resend_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_camp_recip_email ON campaign_recipients(campaign_id, email);

ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS camp_recip_staff ON campaign_recipients;
CREATE POLICY camp_recip_staff ON campaign_recipients FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS camp_recip_updated_at ON campaign_recipients;
CREATE TRIGGER camp_recip_updated_at
  BEFORE UPDATE ON campaign_recipients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
