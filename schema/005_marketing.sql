-- ============================================================================
-- BSC CRM v1 — Migration 005: Marketing (posted_media + ai_generations)
-- ============================================================================
-- Drafted: 2026-05-13 by Jackie
-- Purpose:
--   Track every social-media post + the image that went with it, so we can:
--   1. Never repeat the same picture within 30 days
--   2. Show "what's been posted lately" on /marketing
--   3. Audit AI-generated images (prompt, model, when, cost)
-- ============================================================================

CREATE TABLE IF NOT EXISTS posted_media (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- Hash of the image/video file content. For AI-generated images, this is
  -- the sha256 of the bytes we save. For library images, it's the hash from
  -- media-catalog.json.
  media_hash            TEXT,
  media_kind            TEXT NOT NULL CHECK (media_kind IN ('library', 'ai_generated', 'upload')),
  -- For AI-generated images: the prompt + provider that made it
  ai_prompt             TEXT,
  ai_provider           TEXT, -- 'pollinations', 'openai_dalle', 'google_imagen', etc.
  ai_model              TEXT,
  -- Public URL of the image (if we hosted it) or relative path (if local)
  media_url             TEXT,
  -- Which platform it went to. NULL = draft (not yet posted).
  platform              TEXT CHECK (platform IS NULL OR platform IN (
                          'instagram', 'facebook', 'threads', 'tiktok', 'email', 'sms', 'other'
                        )),
  platform_post_id      TEXT, -- The external ID returned by Meta/IG/etc.
  caption               TEXT,
  -- When it was actually published (vs scheduled / draft)
  posted_at             TIMESTAMPTZ,
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                          'draft', 'scheduled', 'posted', 'failed', 'deleted'
                        )),
  scheduled_for         TIMESTAMPTZ,
  posted_by_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  reach                 INT,
  likes                 INT,
  comments              INT,
  saves                 INT,
  shares                INT,
  insights_synced_at    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posted_media_tenant ON posted_media(tenant_id);
CREATE INDEX IF NOT EXISTS idx_posted_media_hash ON posted_media(tenant_id, media_hash) WHERE media_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posted_media_posted_at ON posted_media(tenant_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_posted_media_platform_post ON posted_media(platform, platform_post_id)
  WHERE platform_post_id IS NOT NULL;

DROP TRIGGER IF EXISTS posted_media_updated_at ON posted_media;
CREATE TRIGGER posted_media_updated_at
  BEFORE UPDATE ON posted_media
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE posted_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_posted_media ON posted_media;
CREATE POLICY tenant_isolation_posted_media ON posted_media
  USING (tenant_id = current_tenant_id());

-- ============================================================================
-- Helper: returns TRUE if a given media_hash was posted in the last N days for
-- this tenant. Used by the post composer to refuse repeats.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.was_media_posted_recently(
  p_media_hash TEXT,
  p_days INT DEFAULT 30
)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.posted_media
    WHERE tenant_id = public.current_tenant_id()
      AND media_hash = p_media_hash
      AND posted_at > NOW() - (p_days || ' days')::INTERVAL
  )
$$;

-- ============================================================================
-- End of migration 005
-- ============================================================================
