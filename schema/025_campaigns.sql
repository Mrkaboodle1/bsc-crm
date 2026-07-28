-- ============================================================================
-- BSC CRM — Migration 025: Campaigns (the editable Marketing home)
-- ============================================================================
-- One table for every marketing piece: monthly newsletters, SMS blasts, and
-- FB/IG social posts. Each row is an editable draft Rhett can edit → schedule →
-- post/send. Franchise-safe (tenant-scoped, staff-only RLS).
-- Safe to run as-is (idempotent).
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email','sms','social')),
  title         TEXT NOT NULL,                 -- internal name, e.g. "July Newsletter"
  month         TEXT,                          -- 'YYYY-MM' for monthly grouping (newsletters)
  subject       TEXT,                          -- email subject line
  content       JSONB NOT NULL DEFAULT '{}'::jsonb, -- structured fields (see app), or {text}
  image_url     TEXT,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sent','archived')),
  scheduled_for TIMESTAMPTZ,
  sort          INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON campaigns(tenant_id, channel, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_month ON campaigns(tenant_id, month);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaigns_staff ON campaigns;
CREATE POLICY campaigns_staff ON campaigns FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
         AND coalesce((SELECT role FROM public.users WHERE id = auth.uid()),'') IN ('owner','manager','coach','support'))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS campaigns_updated_at ON campaigns;
CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
