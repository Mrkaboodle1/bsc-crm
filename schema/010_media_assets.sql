-- Migration 010 — Media library
--
-- Every image (uploaded OR AI-generated) lives in Supabase Storage under the
-- public bucket `media`, and gets one row in `media_assets` with the URL,
-- tenant, source, and a few searchable fields. The Sites builder uses this
-- table to power the image picker that replaces "paste a URL" everywhere.
--
-- Apply once via Supabase SQL editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS media_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  /* Public URL to the file — used directly in <img src>. */
  url             TEXT NOT NULL,
  /* Path within the Supabase Storage bucket (for delete operations). */
  storage_path    TEXT,
  filename        TEXT,
  mime_type       TEXT,
  width           INT,
  height          INT,
  size_bytes      BIGINT,
  /* Origin of the asset — affects how it's surfaced in the library. */
  source          TEXT NOT NULL DEFAULT 'upload'
                    CHECK (source IN ('upload', 'ai', 'external')),
  /* Prompt that produced an AI image, captured for re-runs / iteration. */
  prompt          TEXT,
  alt_text        TEXT,
  tags            TEXT[] DEFAULT '{}',
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_media_assets_tenant ON media_assets(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_source ON media_assets(tenant_id, source);

ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS media_assets_tenant_isolation ON media_assets;
CREATE POLICY media_assets_tenant_isolation ON media_assets
  FOR ALL
  USING      (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- ────────────────────────────────────────────────────────────────────
-- Storage bucket
-- ────────────────────────────────────────────────────────────────────
-- Run the next bit AFTER the table exists. Storage operations use a
-- different system; the bucket and policies are owned by `storage`.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media', 'media', TRUE, 10485760,
        ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif','image/svg+xml'])
ON CONFLICT (id) DO UPDATE
  SET public = TRUE,
      file_size_limit = 10485760,
      allowed_mime_types = ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif','image/svg+xml'];

-- Public read for everyone (anyone with the URL can view the image)
DROP POLICY IF EXISTS "media public read" ON storage.objects;
CREATE POLICY "media public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

-- Authenticated users can upload to their own tenant's folder. We prefix
-- every file with `<tenant_id>/...` and check the prefix on insert.
DROP POLICY IF EXISTS "media authenticated upload" ON storage.objects;
CREATE POLICY "media authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "media authenticated delete" ON storage.objects;
CREATE POLICY "media authenticated delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM users WHERE id = auth.uid()
    )
  );
