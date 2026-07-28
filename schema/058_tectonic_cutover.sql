-- 058_tectonic_cutover.sql
-- The last three things standing between BigStar and cancelling Tectonic:
--   1. conversations  — the 1,788 SMS/email threads with parents
--   2. leads pipeline — the 834 opportunities across 7 stages
--   3. site_visits    — who found us (incl. Google) and what they looked at
-- Paste this whole file into the Supabase SQL editor and Run.

-- ── 1. Conversations (SMS + email threads) ─────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  family_id     UUID REFERENCES families(id) ON DELETE SET NULL,
  contact_name  TEXT,
  phone         TEXT,
  email         TEXT,
  channel       TEXT NOT NULL DEFAULT 'sms' CHECK (channel IN ('sms','email','mixed')),
  last_message  TEXT,
  last_at       TIMESTAMPTZ,
  unread        INT NOT NULL DEFAULT 0,
  import_key    TEXT UNIQUE,              -- 'ghlc:<conversationId>' — makes re-runs safe
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id, last_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_family ON conversations(family_id);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;   -- service-role only, like the rest

CREATE TABLE IF NOT EXISTS conversation_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction        TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  channel          TEXT,
  body             TEXT,
  sent_at          TIMESTAMPTZ,
  import_key       TEXT UNIQUE,           -- 'ghlm:<messageId>'
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conv_msgs ON conversation_messages(conversation_id, sent_at);
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- ── 2. Leads pipeline ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_stages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort        INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE lead_stages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS leads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  family_id    UUID REFERENCES families(id) ON DELETE SET NULL,
  stage_id     UUID REFERENCES lead_stages(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  email        TEXT,
  phone        TEXT,
  value        NUMERIC(10,2),
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','won','lost','abandoned')),
  source       TEXT,
  notes        TEXT,
  import_key   TEXT UNIQUE,               -- 'ghlo:<opportunityId>'
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_stage ON leads(tenant_id, stage_id);
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- ── 3. Website visitor tracking ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_visits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  visitor_id    TEXT,                     -- anonymous id kept in the browser
  path          TEXT,                     -- page they looked at
  referrer      TEXT,                     -- where they came from
  source        TEXT,                     -- 'google' | 'facebook' | 'direct' | …
  search_term   TEXT,                     -- what they typed on our site
  utm_source    TEXT,
  utm_campaign  TEXT,
  country       TEXT,
  occurred_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_site_visits ON site_visits(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_visits_source ON site_visits(tenant_id, source);
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;
