-- Migration 009b — Fix INSERT for Sites & Pages
--
-- The original 009 policy used USING only. While PostgreSQL is meant to
-- default WITH CHECK to the USING expression for inserts, some Supabase
-- pooled-connection setups don't honour that. Explicitly add WITH CHECK
-- and a FOR INSERT permissive policy so inserts succeed.
--
-- Apply once via Supabase SQL editor. Safe to re-run.

DROP POLICY IF EXISTS sites_tenant_isolation      ON sites;
DROP POLICY IF EXISTS site_pages_tenant_isolation ON site_pages;

CREATE POLICY sites_tenant_isolation ON sites
  FOR ALL
  USING      (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY site_pages_tenant_isolation ON site_pages
  FOR ALL
  USING      (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));
