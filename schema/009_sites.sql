-- Migration 009 — Sites & Pages (Tectonic-style website builder)
--
-- Two-level structure:
--   sites       = a container (a website, a funnel, a single landing page)
--   site_pages  = the actual pages inside that site (home, about, contact,
--                 step-1, step-2, thank-you, etc.)
--
-- Page content is stored as a `blocks` JSONB array. Each block is a small
-- object like { type: 'heading', text: '...', level: 1 } — the editor in
-- the app reads/writes this array. Keeping content in JSONB instead of
-- separate rows means no schema migrations every time we add a block type.
--
-- Apply once via Supabase SQL editor.

CREATE TABLE IF NOT EXISTS sites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  -- 'website' = multi-page site, 'funnel' = ordered steps, 'landing' = one-pager
  kind            TEXT NOT NULL DEFAULT 'website'
                    CHECK (kind IN ('website', 'funnel', 'landing')),
  description     TEXT,
  custom_domain   TEXT,
  /* per-site theme (brand colours, font, hero image, etc.) */
  theme           JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_sites_tenant ON sites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sites_published ON sites(tenant_id, is_published) WHERE is_published = TRUE;

CREATE TABLE IF NOT EXISTS site_pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,        -- '' for home, 'about', 'contact'
  /* render order within the site (nav order / funnel step order) */
  position        INT NOT NULL DEFAULT 0,
  /* array of block objects — see TS BlockSchema in app/src/lib/sites/blocks.ts */
  blocks          JSONB NOT NULL DEFAULT '[]'::jsonb,
  seo_title       TEXT,
  seo_description TEXT,
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (site_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_site_pages_site ON site_pages(site_id, position);
CREATE INDEX IF NOT EXISTS idx_site_pages_tenant ON site_pages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_pages_published ON site_pages(site_id, is_published) WHERE is_published = TRUE;

-- ────────────────────────────────────────────────────────────────────
-- Row-level security — tenant isolation
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE sites      ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_pages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sites' AND policyname = 'sites_tenant_isolation') THEN
    CREATE POLICY sites_tenant_isolation ON sites USING (
      tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'site_pages' AND policyname = 'site_pages_tenant_isolation') THEN
    CREATE POLICY site_pages_tenant_isolation ON site_pages USING (
      tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    );
  END IF;
END $$;
