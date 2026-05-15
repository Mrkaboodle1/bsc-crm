-- ============================================================================
-- BSC CRM v1 — Migration 006: Agent Queue + Email Messages
-- ============================================================================
-- Drafted: 15 May 2026 by Jacky
-- Purpose: Two tables that make server-Jacky possible:
--   1. email_messages — every email read from admin@bigstarcircus.com.au
--      (via IMAP) gets persisted here. Classified, linked to family if
--      possible, threaded.
--   2. pending_actions — every outbound message Jacky drafts. Rhett taps
--      approve/edit/reject inside the CRM at /inbox.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- §1 — Email messages (incoming mail mirror)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS email_messages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- The RFC822 Message-ID — globally unique. Used to dedupe re-reads.
  message_id            TEXT NOT NULL,
  in_reply_to           TEXT,
  thread_key            TEXT, -- A hash we use to group conversation threads
  -- Envelope
  from_email            TEXT,
  from_name             TEXT,
  to_emails             TEXT[] DEFAULT '{}',
  cc_emails             TEXT[] DEFAULT '{}',
  subject               TEXT,
  -- Body
  body_text             TEXT,
  body_html             TEXT,
  has_attachments       BOOLEAN DEFAULT FALSE,
  attachment_names      TEXT[] DEFAULT '{}',
  -- Timing
  received_at           TIMESTAMPTZ NOT NULL,
  -- AI classification
  classification        TEXT CHECK (classification IS NULL OR classification IN (
                          'trial_enquiry',
                          'birthday_party',
                          'ndis_enquiry',
                          'school_gig',
                          'corporate_gig',
                          'cancel_or_pause',
                          'invoice_question',
                          'existing_parent',
                          'supplier_or_vendor',
                          'newsletter_or_promo',
                          'junk_or_automated',
                          'other'
                        )),
  classification_confidence NUMERIC(3,2), -- 0.00 to 1.00
  classification_notes  TEXT,
  -- Family / student linking (filled by classifier if it can match)
  matched_family_id     UUID REFERENCES families(id) ON DELETE SET NULL,
  matched_student_id    UUID REFERENCES students(id) ON DELETE SET NULL,
  -- Read status (for Rhett's overview)
  read_at               TIMESTAMPTZ,
  -- Raw store (debugging / audit)
  raw_headers           JSONB,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  -- Uniqueness: don't dupe the same message
  UNIQUE(tenant_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_email_messages_tenant ON email_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_received ON email_messages(tenant_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_thread ON email_messages(thread_key);
CREATE INDEX IF NOT EXISTS idx_email_messages_classification ON email_messages(tenant_id, classification);
CREATE INDEX IF NOT EXISTS idx_email_messages_family ON email_messages(matched_family_id) WHERE matched_family_id IS NOT NULL;

ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_email_messages ON email_messages;
CREATE POLICY tenant_isolation_email_messages ON email_messages
  USING (tenant_id = current_tenant_id());

-- ----------------------------------------------------------------------------
-- §2 — Pending actions (approval queue)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pending_actions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- What kind of action is this?
  kind                  TEXT NOT NULL CHECK (kind IN (
                          'email_reply',
                          'email_forward',
                          'sms_reply',
                          'fb_message_reply',
                          'ig_message_reply',
                          'fb_post',
                          'ig_post',
                          'task',
                          'note'
                        )),
  -- Provenance
  triggered_by          TEXT NOT NULL CHECK (triggered_by IN (
                          'inbound_email',
                          'inbound_sms',
                          'inbound_fb_dm',
                          'inbound_ig_dm',
                          'scheduled_routine',
                          'manual',
                          'campaign'
                        )),
  source_email_id       UUID REFERENCES email_messages(id) ON DELETE SET NULL,
  related_family_id     UUID REFERENCES families(id) ON DELETE SET NULL,
  related_student_id    UUID REFERENCES students(id) ON DELETE SET NULL,
  -- Draft content (depends on kind)
  draft_subject         TEXT,
  draft_body            TEXT,
  draft_recipient       TEXT, -- email / phone / FB user id
  draft_metadata        JSONB DEFAULT '{}'::jsonb,
  -- Risk / urgency hints
  priority              TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  reasoning             TEXT, -- Why Jacky thinks this is the right reply
  -- State machine
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                          'pending',     -- waiting for approval
                          'approved',    -- Rhett tapped approve
                          'rejected',    -- Rhett tapped reject
                          'sent',        -- successfully delivered
                          'failed',      -- send attempted, failed
                          'snoozed',     -- defer to later
                          'auto_sent'    -- Stage 2/3 — sent without manual approval
                        )),
  approved_by_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at           TIMESTAMPTZ,
  approved_edits        TEXT, -- if Rhett edited the draft before approving
  rejected_reason       TEXT,
  snoozed_until         TIMESTAMPTZ,
  -- Delivery
  sent_at               TIMESTAMPTZ,
  delivery_metadata     JSONB,
  -- AI provenance (so we can audit cost / model / prompt later)
  ai_provider           TEXT, -- 'anthropic' | 'google' | 'pollinations' etc.
  ai_model              TEXT, -- e.g. 'claude-sonnet-4-7'
  ai_input_tokens       INT,
  ai_output_tokens      INT,
  ai_cost_usd           NUMERIC(8,4),
  -- Timestamps
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_actions_tenant_status ON pending_actions(tenant_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_pending_actions_created ON pending_actions(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_actions_family ON pending_actions(related_family_id) WHERE related_family_id IS NOT NULL;

DROP TRIGGER IF EXISTS pending_actions_updated_at ON pending_actions;
CREATE TRIGGER pending_actions_updated_at
  BEFORE UPDATE ON pending_actions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE pending_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_pending_actions ON pending_actions;
CREATE POLICY tenant_isolation_pending_actions ON pending_actions
  USING (tenant_id = current_tenant_id());

-- ----------------------------------------------------------------------------
-- §3 — Agent activity log (so Rhett can see what Jacky's been up to)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agent_activity (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  routine               TEXT NOT NULL, -- 'triage_inbox' | 'morning_summary' | 'manual'
  started_at            TIMESTAMPTZ DEFAULT NOW(),
  finished_at           TIMESTAMPTZ,
  status                TEXT DEFAULT 'running' CHECK (status IN ('running', 'success', 'failure')),
  emails_read           INT DEFAULT 0,
  drafts_created        INT DEFAULT 0,
  actions_sent          INT DEFAULT 0,
  errors                JSONB DEFAULT '[]'::jsonb,
  log_summary           TEXT,
  ai_cost_usd           NUMERIC(8,4) DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_activity_tenant ON agent_activity(tenant_id, started_at DESC);

ALTER TABLE agent_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_agent_activity ON agent_activity;
CREATE POLICY tenant_isolation_agent_activity ON agent_activity
  USING (tenant_id = current_tenant_id());

-- ----------------------------------------------------------------------------
-- §4 — Helper: enqueue an action (called from server-Jacky)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enqueue_action(
  p_tenant_id UUID,
  p_kind TEXT,
  p_triggered_by TEXT,
  p_source_email_id UUID,
  p_related_family_id UUID,
  p_draft_subject TEXT,
  p_draft_body TEXT,
  p_draft_recipient TEXT,
  p_priority TEXT DEFAULT 'normal',
  p_reasoning TEXT DEFAULT NULL,
  p_ai_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.pending_actions (
    tenant_id, kind, triggered_by,
    source_email_id, related_family_id,
    draft_subject, draft_body, draft_recipient,
    priority, reasoning,
    ai_provider, ai_model, ai_input_tokens, ai_output_tokens, ai_cost_usd
  )
  VALUES (
    p_tenant_id, p_kind, p_triggered_by,
    p_source_email_id, p_related_family_id,
    p_draft_subject, p_draft_body, p_draft_recipient,
    p_priority, p_reasoning,
    p_ai_metadata->>'provider',
    p_ai_metadata->>'model',
    (p_ai_metadata->>'input_tokens')::INT,
    (p_ai_metadata->>'output_tokens')::INT,
    (p_ai_metadata->>'cost_usd')::NUMERIC
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- ============================================================================
-- End of migration 006
-- ============================================================================
-- After applying this migration:
--   • server-Jacky writes incoming emails to email_messages
--   • drafts go to pending_actions with status='pending'
--   • the CRM /inbox page reads pending_actions to show the approval queue
--   • Rhett approves/edits/rejects, status changes to 'approved'/'rejected'
--   • a worker picks up approved rows, sends them, marks status='sent'
-- ============================================================================
