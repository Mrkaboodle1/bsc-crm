-- ============================================================================
-- BSC CRM v1 — Migration 016: Reception Till (POS) + Memberships
-- ============================================================================
-- Drafted: 2026-06-07 by Jacky
-- Purpose: franchise-ready point-of-sale + memberships.
--   • products         — one catalogue powering BOTH the public Shop and the
--                        reception Till (in_shop / in_pos flags).
--   • sales            — every till transaction (items stored as JSONB).
--   • membership_plans — the plans/passes a business offers.
-- All tenant-scoped. RLS on; API routes use the service role.
-- Run order: after 015_forms.sql. Safe to re-run (idempotent).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- §1 — PRODUCTS (shop + till catalogue)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  price         NUMERIC(10,2) NOT NULL DEFAULT 0,
  category      TEXT NOT NULL DEFAULT 'merch'
                  CHECK (category IN ('merch','class','ticket','pass','food','gift','other')),
  emoji         TEXT,
  image_url     TEXT,
  sku           TEXT,
  track_stock   BOOLEAN NOT NULL DEFAULT FALSE,
  stock_qty     INT,
  in_shop       BOOLEAN NOT NULL DEFAULT TRUE,   -- show on public /shop
  in_pos        BOOLEAN NOT NULL DEFAULT TRUE,   -- show on reception till
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  sort          INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS products_tenant_idx ON products (tenant_id, active, sort);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS products_tenant_read ON products;
CREATE POLICY products_tenant_read ON products
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- ----------------------------------------------------------------------------
-- §2 — SALES (reception till transactions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sold_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method  TEXT NOT NULL DEFAULT 'cash'
                    CHECK (payment_method IN ('cash','card','account','gift','other')),
  staff_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  family_id       UUID REFERENCES families(id) ON DELETE SET NULL,
  items           JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{product_id,name,price,qty}]
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sales_tenant_day_idx ON sales (tenant_id, sold_at DESC);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sales_tenant_read ON sales;
CREATE POLICY sales_tenant_read ON sales
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- ----------------------------------------------------------------------------
-- §3 — MEMBERSHIP PLANS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS membership_plans (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  price          NUMERIC(10,2) NOT NULL DEFAULT 0,
  billing_period TEXT NOT NULL DEFAULT 'weekly'
                   CHECK (billing_period IN ('weekly','fortnightly','monthly','term','yearly','one_off')),
  perks          TEXT[] NOT NULL DEFAULT '{}',
  class_credits  INT,                          -- NULL = unlimited
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  sort           INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS membership_plans_tenant_idx ON membership_plans (tenant_id, active, sort);

ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS membership_plans_tenant_read ON membership_plans;
CREATE POLICY membership_plans_tenant_read ON membership_plans
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- ----------------------------------------------------------------------------
-- §4 — Seed the current Big Star catalogue + plans (first tenant only, once)
-- ----------------------------------------------------------------------------
DO $$
DECLARE t_id UUID;
BEGIN
  SELECT id INTO t_id FROM tenants ORDER BY created_at LIMIT 1;
  IF t_id IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (SELECT 1 FROM products WHERE tenant_id = t_id) THEN
    INSERT INTO products (tenant_id, name, description, price, category, emoji, in_shop, in_pos, sort) VALUES
      (t_id, 'Term Pass (10 weeks)', 'One weekly class for the whole term — best value.', 200, 'pass',   '🎟️', TRUE, TRUE, 1),
      (t_id, 'Casual Class',         'Drop in to a single class.',                         25,  'class',  '🤸', TRUE, TRUE, 2),
      (t_id, 'Holiday Workshop Day', '9am–3pm school-holiday circus fun.',                 75,  'ticket', '🏕️', TRUE, TRUE, 3),
      (t_id, 'Show Ticket',          'Come watch our young stars perform.',                20,  'ticket', '⭐', TRUE, TRUE, 4),
      (t_id, 'T-Shirt',              'Official tee.',                                      30,  'merch',  '👕', TRUE, TRUE, 5),
      (t_id, 'Water Bottle',         'Branded drink bottle.',                              15,  'merch',  '🥤', TRUE, TRUE, 6),
      (t_id, 'Gift Card',            'The gift of circus — any amount.',                   50,  'gift',   '🎁', TRUE, TRUE, 7);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM membership_plans WHERE tenant_id = t_id) THEN
    INSERT INTO membership_plans (tenant_id, name, description, price, billing_period, perks, class_credits, sort) VALUES
      (t_id, '1 Class / week',  'One weekly class. Direct debit, cancel with 2 weeks notice.', 27, 'weekly', ARRAY['1 class each week','Sibling discount','Paused over school holidays'], NULL, 1),
      (t_id, '2 Classes / week','Two weekly classes — $25/class.',                              50, 'weekly', ARRAY['2 classes each week','Sibling discount'], NULL, 2),
      (t_id, '3 Classes / week','Three weekly classes — $20/class.',                            60, 'weekly', ARRAY['3 classes each week','Best value','Sibling discount'], NULL, 3),
      (t_id, '10-Class Pass',   'Ten classes to use any time.',                                 250,'one_off',ARRAY['Use any time','Great for casual families'], 10, 4);
  END IF;
END $$;
