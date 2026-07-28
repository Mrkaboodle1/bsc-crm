-- 059_bigstar_radar.sql
-- BIGSTAR RADAR — the expansion intelligence system, plus the CEO dashboard's
-- editable targets and the Stadium Fund.
--
-- The goal this serves: 650 active students → ~$1M recurring → Cbus Stadium.
-- Satellite schools run out of cheap community venues, fed from HQ.
--
-- Paste this whole file into the Supabase SQL editor and Run.

-- ── Suburbs — the heart of the radar ──────────────────────────────────
CREATE TABLE IF NOT EXISTS expansion_suburbs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                   TEXT NOT NULL,
  lga                    TEXT,                    -- local government area
  postcode               TEXT,
  region                 TEXT,                    -- Gold Coast / Logan / Ipswich / Brisbane
  population             INT,
  children_5_16          INT,
  population_growth_pct  NUMERIC(5,2),
  primary_schools        INT,
  high_schools           INT,
  childcare_centres      INT,
  oshc_providers         INT,
  homeschool_activity    TEXT,                    -- none | some | strong
  ndis_activity          TEXT,
  new_estates            TEXT,
  median_income          INT,
  family_household_pct   NUMERIC(5,2),
  distance_km            NUMERIC(6,1),            -- from Molendinar HQ
  travel_minutes_pm      INT,                     -- afternoon traffic
  public_transport       TEXT,
  -- problem / solution framing
  main_problem           TEXT,
  problem_evidence       TEXT,
  bigstar_solution       TEXT,
  marketing_message      TEXT,
  launch_program         TEXT,
  opening_offer          TEXT,
  -- scoring (0-100, computed in the app but stored so history is kept)
  score                  INT,
  score_breakdown        JSONB DEFAULT '{}'::jsonb,
  confidence             TEXT DEFAULT 'low' CHECK (confidence IN ('low','medium','high')),
  status                 TEXT NOT NULL DEFAULT 'research'
                           CHECK (status IN ('research','watch','demand_test','venue_search','launch_ready','open','rejected')),
  notes                  TEXT,
  sources                JSONB DEFAULT '[]'::jsonb,  -- [{label,url,checked_on}]
  last_checked           DATE,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exp_suburbs ON expansion_suburbs(tenant_id, score DESC);
ALTER TABLE expansion_suburbs ENABLE ROW LEVEL SECURITY;

-- ── Venues ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expansion_venues (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  suburb_id          UUID REFERENCES expansion_suburbs(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  venue_type         TEXT,        -- community centre | church | scout hall | PCYC | school hall | …
  address            TEXT,
  suburb             TEXT,
  contact_name       TEXT,
  phone              TEXT,
  email              TEXT,
  website            TEXT,
  hall_size_sqm      INT,
  ceiling_height_m   NUMERIC(4,1),
  floor_type         TEXT,
  parking            TEXT,
  toilets            BOOLEAN,
  kitchen            BOOLEAN,
  accessible         BOOLEAN,
  air_conditioning   BOOLEAN,
  storage            TEXT,
  noise_limits       TEXT,
  liability_required TEXT,
  rate_casual        NUMERIC(8,2),
  rate_nonprofit     NUMERIC(8,2),
  bond               NUMERIC(8,2),
  min_booking_hours  NUMERIC(4,1),
  avail_mon          TEXT, avail_tue TEXT, avail_wed TEXT, avail_thu TEXT, avail_fri TEXT, avail_sat TEXT,
  existing_classes   TEXT,        -- dance / gymnastics / performing arts already there
  booking_conflicts  TEXT,
  ok_ground_circus   BOOLEAN,
  ok_acrobatics      BOOLEAN,
  ok_aerial          BOOLEAN,
  score              INT,
  contact_status     TEXT DEFAULT 'not_contacted'
                       CHECK (contact_status IN ('not_contacted','emailed','called','awaiting_reply','quoted','inspected','booked','rejected')),
  inspected_on       DATE,
  needs_confirmation TEXT,        -- anything we could NOT verify
  notes              TEXT,
  source_url         TEXT,
  verified_on        DATE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exp_venues ON expansion_venues(tenant_id, suburb_id);
ALTER TABLE expansion_venues ENABLE ROW LEVEL SECURITY;

-- ── Competitors ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expansion_competitors (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  suburb_id         UUID REFERENCES expansion_suburbs(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  category          TEXT,      -- circus | gymnastics | dance | cheer | ninja | martial arts | aerial | performing arts
  suburb            TEXT,
  website           TEXT,
  socials           TEXT,
  target_ages       TEXT,
  pricing           TEXT,
  timetable         TEXT,
  distance_km       NUMERIC(6,1),
  reviews           TEXT,
  waitlist_evidence TEXT,
  strengths         TEXT,
  weaknesses        TEXT,
  direct_competitor BOOLEAN DEFAULT TRUE,
  our_difference    TEXT,
  pressure_score    INT,       -- 0-10, higher = more competitive pressure
  source_url        TEXT,
  verified_on       DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exp_competitors ON expansion_competitors(tenant_id, suburb_id);
ALTER TABLE expansion_competitors ENABLE ROW LEVEL SECURITY;

-- ── Community & marketing channels ────────────────────────────────────
CREATE TABLE IF NOT EXISTS expansion_community (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  suburb_id      UUID REFERENCES expansion_suburbs(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  platform       TEXT,     -- facebook | instagram | school | library | market | newsletter…
  link           TEXT,
  catchment      TEXT,
  audience_size  INT,
  activity_level TEXT,     -- quiet | steady | busy
  promo_allowed  TEXT,     -- yes | no | ask admin | unknown
  posting_rules  TEXT,
  contact_person TEXT,
  usefulness     INT,      -- 0-10
  access_status  TEXT DEFAULT 'not_joined'
                   CHECK (access_status IN ('not_joined','requested','joined','blocked','n/a')),
  last_checked   DATE,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exp_community ON expansion_community(tenant_id, suburb_id);
ALTER TABLE expansion_community ENABLE ROW LEVEL SECURITY;

-- ── Demand-test leads (parents who put their hand up) ─────────────────
CREATE TABLE IF NOT EXISTS expansion_leads (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  suburb_id      UUID REFERENCES expansion_suburbs(id) ON DELETE CASCADE,
  stage          TEXT DEFAULT 'organic' CHECK (stage IN ('organic','paid','popup')),
  parent_name    TEXT,
  email          TEXT,
  phone          TEXT,
  child_age      INT,
  suburb         TEXT,
  preferred_day  TEXT,
  preferred_time TEXT,
  wants_circus   BOOLEAN,
  wants_acro     BOOLEAN,
  wants_aerial   BOOLEAN,
  wants_homeschool BOOLEAN,
  wants_inclusive  BOOLEAN,
  would_trial    BOOLEAN,
  max_travel_min INT,
  outcome        TEXT DEFAULT 'interested'
                   CHECK (outcome IN ('interested','booked_trial','attended','joined','no_show','lost')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exp_leads ON expansion_leads(tenant_id, suburb_id);
ALTER TABLE expansion_leads ENABLE ROW LEVEL SECURITY;

-- ── Tasks / next actions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expansion_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  suburb_id   UUID REFERENCES expansion_suburbs(id) ON DELETE CASCADE,
  venue_id    UUID REFERENCES expansion_venues(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  detail      TEXT,
  due_on      DATE,
  done        BOOLEAN DEFAULT FALSE,
  done_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exp_tasks ON expansion_tasks(tenant_id, done, due_on);
ALTER TABLE expansion_tasks ENABLE ROW LEVEL SECURITY;

-- ── CEO dashboard: editable targets + Stadium Fund ────────────────────
CREATE TABLE IF NOT EXISTS ceo_targets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  target_year  INT DEFAULT 2032,
  students     INT DEFAULT 650,
  revenue      NUMERIC(12,2) DEFAULT 1014000,
  satellites   INT DEFAULT 5,
  stadium_goal NUMERIC(12,2) DEFAULT 250000,
  youtube_subs INT DEFAULT 100000,
  nps_target   INT DEFAULT 90,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ceo_targets ENABLE ROW LEVEL SECURITY;

-- Money that goes IN and never comes out.
CREATE TABLE IF NOT EXISTS stadium_fund (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL,
  note        TEXT,
  added_on    DATE DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stadium_fund ON stadium_fund(tenant_id, added_on);
ALTER TABLE stadium_fund ENABLE ROW LEVEL SECURITY;

-- Weekly KPI snapshots so we can chart the climb to 650.
CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  week_start     DATE NOT NULL,
  students       INT,
  weekly_revenue NUMERIC(10,2),
  joined         INT,
  cancelled      INT,
  attended       INT,
  trials         INT,
  satellites     INT,
  metrics        JSONB DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, week_start)
);
ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;
