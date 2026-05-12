-- ============================================================================
-- BSC CRM v1 — Initial Schema (Multi-tenant from Day 1)
-- ============================================================================
-- Drafted: 2026-05-12 by Jackie
-- Target: Supabase Postgres
-- Pattern: Every domain table has a tenant_id column + RLS policies for
--          tenant isolation. BSC = tenant #1. Future SaaS customers = #2+.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- pgvector for AI embeddings (semantic search of family records, past emails, etc.) — Phase 2
-- CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- §1 — TENANT ROOT
-- ============================================================================

CREATE TABLE tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  primary_colour  TEXT DEFAULT '#D72027',
  accent_colour   TEXT DEFAULT '#FFC107',
  logo_url        TEXT,
  abn             TEXT,
  address         TEXT,
  phone           TEXT,
  email           TEXT,
  website         TEXT,
  stripe_account_id TEXT,         -- For SaaS billing of tenants (Year 2+)
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  plan            TEXT DEFAULT 'founder' CHECK (plan IN ('founder', 'starter', 'pro', 'enterprise')),
  founded_year    INT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Customer #1 — Big Star Circus
INSERT INTO tenants (slug, name, abn, address, phone, email, website, founded_year, plan)
VALUES (
  'bigstarcircus',
  'Big Star Circus',
  '18 678 780 722',
  'Unit 1/14 Harper Street, Molendinar QLD 4214',
  '0489 188 179',
  'admin@bigstarcircus.com.au',
  'https://bigstarcircus.com.au',
  2023,
  'founder'
);

-- ============================================================================
-- §2 — USERS (linked to Supabase Auth)
-- ============================================================================

CREATE TABLE users (
  id              UUID PRIMARY KEY,  -- matches auth.users.id from Supabase Auth
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email           TEXT UNIQUE NOT NULL,
  full_name       TEXT,
  role            TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'coach', 'parent', 'support')),
  phone           TEXT,
  avatar_url      TEXT,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_role ON users(tenant_id, role);

-- ============================================================================
-- §3 — FAMILIES (customer household / billing entity)
-- ============================================================================

CREATE TABLE families (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  family_name         TEXT NOT NULL,
  primary_parent      TEXT,
  email               TEXT,
  phone               TEXT,
  emergency_phone     TEXT,
  address             TEXT,
  source              TEXT CHECK (source IN ('fb_ad', 'instagram', 'google', 'word_of_mouth', 'school', 'walkin', 'open_day', 'other')),
  lifecycle_stage     TEXT DEFAULT 'lead' CHECK (lifecycle_stage IN ('lead', 'trial', 'active', 'paused', 'past', 'lost')),
  stripe_customer_id  TEXT,
  weekly_fee_total    NUMERIC(10,2) DEFAULT 0,  -- cached from active enrolments
  parent_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,  -- if parent has a login
  notes               TEXT,
  tags                TEXT[] DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_families_tenant ON families(tenant_id);
CREATE INDEX idx_families_stage ON families(tenant_id, lifecycle_stage);
CREATE INDEX idx_families_email ON families(tenant_id, email);
CREATE INDEX idx_families_stripe ON families(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- ============================================================================
-- §4 — STUDENTS (children, linked to families)
-- ============================================================================

CREATE TABLE students (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  family_id           UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  first_name          TEXT NOT NULL,
  last_name           TEXT,
  date_of_birth       DATE,
  medical_notes       TEXT,
  photo_consent       BOOLEAN DEFAULT FALSE,
  photo_consent_date  DATE,
  blue_card_number    TEXT,  -- only if 14+
  blue_card_expiry    DATE,
  total_stars         INT DEFAULT 0,  -- denormalised cache, rebuilt from star_ledger
  star_tier           INT DEFAULT 1,  -- 1-5 calculated from total_stars
  trainee_status      TEXT DEFAULT 'not_yet' CHECK (trainee_status IN ('not_yet', 'invited', 'active')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_students_tenant ON students(tenant_id);
CREATE INDEX idx_students_family ON students(family_id);
CREATE INDEX idx_students_tier ON students(tenant_id, star_tier);

-- ============================================================================
-- §5 — COACHES
-- ============================================================================

CREATE TABLE coaches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES users(id) ON DELETE SET NULL,  -- if coach has login
  full_name           TEXT NOT NULL,
  email               TEXT,
  phone               TEXT,
  role                TEXT CHECK (role IN ('head', 'adult', 'trainee', 'casual')),
  employment_type     TEXT CHECK (employment_type IN ('employee_casual', 'employee_parttime', 'contractor', 'trainee_honorarium')),
  pay_rate            NUMERIC(8,2),
  skills              TEXT[] DEFAULT '{}',  -- ['acro', 'aerial', 'juggling', 'drama', 'gymnastics', 'balloon', 'clowning']
  blue_card_number    TEXT,
  blue_card_expiry    DATE,
  first_aid_expiry    DATE,
  ga_accreditation    TEXT CHECK (ga_accreditation IN ('none', 'fundamental', 'intermediate', 'advanced')),
  status              TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'departed')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coaches_tenant ON coaches(tenant_id);

-- ============================================================================
-- §6 — CLASSES (recurring weekly class definitions)
-- ============================================================================

CREATE TABLE classes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,  -- "Mon 3:45 Circus Acro 5-8"
  day_of_week         INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sun, 6=Sat
  start_time          TIME NOT NULL,
  duration_minutes    INT DEFAULT 60,
  discipline          TEXT NOT NULL CHECK (discipline IN ('circus_acro', 'aerial', 'fusion', 'drama', 'toddler', 'homeschool', 'adult', 'ndis', 'private', 'show_programme')),
  age_min             INT,
  age_max             INT,
  primary_coach_id    UUID REFERENCES coaches(id) ON DELETE SET NULL,
  capacity            INT DEFAULT 10,
  weekly_fee          NUMERIC(8,2),  -- $27, $25, $20 depending on tier
  status              TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_classes_tenant ON classes(tenant_id);
CREATE INDEX idx_classes_day ON classes(tenant_id, day_of_week, start_time);

-- ============================================================================
-- §7 — ENROLMENTS (student ↔ class link)
-- ============================================================================

CREATE TABLE enrolments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id            UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  start_date          DATE NOT NULL,
  end_date            DATE,  -- NULL = ongoing
  status              TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  term                TEXT,  -- "Term 2 2026"
  weekly_fee          NUMERIC(8,2),  -- snapshot of the price at enrolment time
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, class_id, start_date)
);

CREATE INDEX idx_enrolments_tenant ON enrolments(tenant_id);
CREATE INDEX idx_enrolments_student ON enrolments(student_id);
CREATE INDEX idx_enrolments_class ON enrolments(class_id);
CREATE INDEX idx_enrolments_active ON enrolments(tenant_id, status) WHERE status = 'active';

-- ============================================================================
-- §8 — ATTENDANCE (the Roll Call table — the killer feature)
-- ============================================================================

CREATE TABLE attendance (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id            UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  enrolment_id        UUID REFERENCES enrolments(id) ON DELETE SET NULL,
  date                DATE NOT NULL,
  status              TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'makeup', 'excused')),
  stars_awarded_today INT DEFAULT 0,
  coach_notes         TEXT,
  marked_by_coach_id  UUID REFERENCES coaches(id) ON DELETE SET NULL,
  marked_at           TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, class_id, date)
);

CREATE INDEX idx_attendance_tenant ON attendance(tenant_id);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_class_date ON attendance(class_id, date);
CREATE INDEX idx_attendance_date ON attendance(tenant_id, date);

-- ============================================================================
-- §9 — STAR LEDGER (every star ever awarded — the BSC IP)
-- ============================================================================

CREATE TABLE star_ledger (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  stars               INT NOT NULL CHECK (stars > 0),
  reason              TEXT NOT NULL CHECK (reason IN ('skill_milestone', 'discipline', 'attendance', 'google_review', 'social_tag', 'referral', 'showcase', 'other')),
  notes               TEXT,
  awarded_by_coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  related_attendance_id UUID REFERENCES attendance(id) ON DELETE SET NULL,  -- if awarded during roll call
  awarded_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_star_ledger_tenant ON star_ledger(tenant_id);
CREATE INDEX idx_star_ledger_student ON star_ledger(student_id);
CREATE INDEX idx_star_ledger_date ON star_ledger(tenant_id, awarded_at);

-- ============================================================================
-- §10 — SUBSCRIPTIONS (Stripe-synced)
-- ============================================================================

CREATE TABLE subscriptions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  family_id                UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  stripe_subscription_id   TEXT UNIQUE,
  stripe_price_id          TEXT,
  plan                     TEXT CHECK (plan IN ('one_class', 'two_class', 'three_class', 'year_round', 'casual', 'private')),
  weekly_amount            NUMERIC(8,2),
  hold_fee                 NUMERIC(8,2),  -- Year-Round Membership hold-fee during holidays
  status                   TEXT NOT NULL CHECK (status IN ('active', 'paused', 'cancelled', 'past_due', 'incomplete')),
  current_period_start     DATE,
  current_period_end       DATE,
  next_charge_date         DATE,
  started_at               TIMESTAMPTZ,
  cancelled_at             TIMESTAMPTZ,
  cancellation_reason      TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subs_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subs_family ON subscriptions(family_id);
CREATE INDEX idx_subs_status ON subscriptions(tenant_id, status);
CREATE INDEX idx_subs_stripe ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- ============================================================================
-- §11 — UPDATE TRIGGERS (keep updated_at fresh)
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER families_updated_at BEFORE UPDATE ON families FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER coaches_updated_at BEFORE UPDATE ON coaches FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER classes_updated_at BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER enrolments_updated_at BEFORE UPDATE ON enrolments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- §12 — STAR LEDGER → STUDENT.total_stars maintenance
-- ============================================================================

CREATE OR REPLACE FUNCTION update_student_stars()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE students
    SET total_stars = total_stars + NEW.stars,
        star_tier = CASE
          WHEN total_stars + NEW.stars >= 76 THEN 5
          WHEN total_stars + NEW.stars >= 36 THEN 4
          WHEN total_stars + NEW.stars >= 16 THEN 3
          WHEN total_stars + NEW.stars >=  6 THEN 2
          ELSE 1
        END
    WHERE id = NEW.student_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE students
    SET total_stars = GREATEST(0, total_stars - OLD.stars),
        star_tier = CASE
          WHEN total_stars - OLD.stars >= 76 THEN 5
          WHEN total_stars - OLD.stars >= 36 THEN 4
          WHEN total_stars - OLD.stars >= 16 THEN 3
          WHEN total_stars - OLD.stars >=  6 THEN 2
          ELSE 1
        END
    WHERE id = OLD.student_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER star_ledger_update_student
AFTER INSERT OR DELETE ON star_ledger
FOR EACH ROW EXECUTE FUNCTION update_student_stars();

-- ============================================================================
-- §13 — ROW-LEVEL SECURITY (multi-tenant isolation)
-- ============================================================================

-- Helper function: get the current user's tenant_id
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Enable RLS on every table
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrolments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE star_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies (apply to every domain table)
CREATE POLICY tenant_isolation_families      ON families      USING (tenant_id = current_tenant_id());
CREATE POLICY tenant_isolation_students      ON students      USING (tenant_id = current_tenant_id());
CREATE POLICY tenant_isolation_coaches       ON coaches       USING (tenant_id = current_tenant_id());
CREATE POLICY tenant_isolation_classes       ON classes       USING (tenant_id = current_tenant_id());
CREATE POLICY tenant_isolation_enrolments    ON enrolments    USING (tenant_id = current_tenant_id());
CREATE POLICY tenant_isolation_attendance    ON attendance    USING (tenant_id = current_tenant_id());
CREATE POLICY tenant_isolation_star_ledger   ON star_ledger   USING (tenant_id = current_tenant_id());
CREATE POLICY tenant_isolation_subscriptions ON subscriptions USING (tenant_id = current_tenant_id());

-- Tenant table: users only see their own tenant row
CREATE POLICY users_see_own_tenant ON tenants
  USING (id = current_tenant_id());

-- Users table: users see their tenant's users (helps owner/manager admin views)
CREATE POLICY users_see_tenant_users ON users
  USING (tenant_id = current_tenant_id());

-- Additional role-based policies will be layered on top in subsequent migrations
-- (e.g. coaches only see classes they're assigned to; parents only see their own family)

-- ============================================================================
-- §14 — INITIAL DATA SEED (BSC's actual classes from the schedule)
-- ============================================================================

-- Resolved tenant_id for BSC
WITH bsc AS (SELECT id FROM tenants WHERE slug = 'bigstarcircus')
INSERT INTO classes (tenant_id, name, day_of_week, start_time, duration_minutes, discipline, age_min, age_max, capacity, weekly_fee)
SELECT bsc.id, * FROM bsc, (VALUES
  -- Monday
  ('Mon 3:45 Circus Acro 5-8',     1, '15:45'::TIME, 60, 'circus_acro', 5, 8, 10, 27.00),
  ('Mon 4:45 Circus Acro 9-15',    1, '16:45'::TIME, 60, 'circus_acro', 9, 15, 10, 27.00),
  ('Mon 5:45 Adult Circus',        1, '17:45'::TIME, 60, 'adult', 18, NULL, 10, 30.00),
  -- Tuesday
  ('Tue 9:00 Bubby & Me Toddler',  2, '09:00'::TIME, 45, 'toddler', 1, 4, 8, 20.00),
  ('Tue 3:45 Junior Aerial',       2, '15:45'::TIME, 60, 'aerial', 5, 8, 6, 27.00),
  ('Tue 5:00 Senior Aerial',       2, '17:00'::TIME, 60, 'aerial', 9, 15, 6, 27.00),
  ('Tue 6:15 Teen Aerial',         2, '18:15'::TIME, 60, 'aerial', 13, 17, 6, 27.00),
  -- Wednesday
  ('Wed 9:30 Homeschool Acro',     3, '09:30'::TIME, 60, 'homeschool', 5, 15, 10, 27.00),
  ('Wed 10:30 Homeschool Circus',  3, '10:30'::TIME, 60, 'homeschool', 5, 15, 10, 27.00),
  ('Wed 11:30 Homeschool Aerial',  3, '11:30'::TIME, 60, 'homeschool', 5, 15, 6, 27.00),
  ('Wed 3:45 Circus Fusion 5-8',   3, '15:45'::TIME, 60, 'fusion', 5, 8, 10, 27.00),
  ('Wed 4:45 Circus Fusion 8-15',  3, '16:45'::TIME, 60, 'fusion', 8, 15, 10, 27.00),
  -- Thursday
  ('Thu 3:45 Circus Fusion 5-8',   4, '15:45'::TIME, 60, 'fusion', 5, 8, 10, 27.00),
  ('Thu 4:45 Circus Fusion 9-15',  4, '16:45'::TIME, 60, 'fusion', 9, 15, 10, 27.00),
  ('Thu 5:45 Trainee Show Programme', 4, '17:45'::TIME, 75, 'show_programme', 13, 17, 6, 0.00),
  -- Friday
  ('Fri 3:45 Junior Aerial',       5, '15:45'::TIME, 60, 'aerial', 5, 8, 6, 27.00),
  ('Fri 4:45 Senior Aerial',       5, '16:45'::TIME, 60, 'aerial', 9, 15, 6, 27.00),
  -- Saturday
  ('Sat 9:00 Circus Fusion',       6, '09:00'::TIME, 60, 'fusion', 5, 15, 10, 27.00)
) AS data(name, day_of_week, start_time, duration_minutes, discipline, age_min, age_max, capacity, weekly_fee);

-- Coaches (initial seed)
WITH bsc AS (SELECT id FROM tenants WHERE slug = 'bigstarcircus')
INSERT INTO coaches (tenant_id, full_name, role, employment_type, pay_rate, skills, status)
SELECT bsc.id, * FROM bsc, (VALUES
  ('Rhett Morrow',     'head',    'employee_parttime', NULL, ARRAY['acro','aerial','juggling','drama','gymnastics','balloon','clowning']::TEXT[], 'active'),
  ('Rodrigo Hoyos',    'adult',   'contractor',        50.00, ARRAY['acro','aerial','gymnastics','juggling','unicycling']::TEXT[], 'active'),
  ('Tamara Seiler',    'adult',   'contractor',        35.00, ARRAY['aerial']::TEXT[], 'active'),
  ('Charlie',          'trainee', 'trainee_honorarium', 20.00, ARRAY['acro','aerial','clowning']::TEXT[], 'active'),
  ('Aliyah',           'trainee', 'trainee_honorarium', 20.00, ARRAY['acro','aerial']::TEXT[], 'active'),
  ('Lewis',            'trainee', 'trainee_honorarium', 20.00, ARRAY['acro','aerial']::TEXT[], 'active')
) AS data(full_name, role, employment_type, pay_rate, skills, status);

-- ============================================================================
-- End of initial migration
-- ============================================================================
-- Run this in Supabase SQL Editor after creating the project.
-- Subsequent migrations: 002_leads_bookings.sql, 003_ndis.sql, etc.
-- ============================================================================
