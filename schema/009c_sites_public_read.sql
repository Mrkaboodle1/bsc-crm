-- Migration 009c — Public read of published sites and pages
--
-- Adds two extra RLS policies on sites + site_pages that let anonymous
-- visitors SELECT rows where is_published = TRUE. This is how the
-- /s/<siteSlug> public renderer works — no service-role key required,
-- and security stays tight because only published rows are visible.
--
-- Apply once via Supabase SQL editor. Safe to re-run.

DROP POLICY IF EXISTS sites_public_read      ON sites;
CREATE POLICY sites_public_read ON sites
  FOR SELECT
  TO anon
  USING (is_published = TRUE);

DROP POLICY IF EXISTS site_pages_public_read ON site_pages;
CREATE POLICY site_pages_public_read ON site_pages
  FOR SELECT
  TO anon
  USING (is_published = TRUE);
