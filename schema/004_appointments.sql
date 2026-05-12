-- ============================================================================
-- BSC CRM v1 — Migration 004: Appointments (Rhett's personal calendar)
-- ============================================================================
-- Drafted: 2026-05-13 by Jackie
-- Purpose:
--   Adds an appointments table for one-off events that aren't recurring
--   weekly classes: shows, private lessons, parties, workshops, internal
--   meetings, personal blocks.
--
--   Combined with the existing `classes` table, this powers the calendar
--   view and the "next up" banner that alerts Rhett before a show or lesson.
-- ============================================================================

CREATE TABLE IF NOT EXISTS appointments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  type                  TEXT NOT NULL CHECK (type IN (
                          'show', 'private_lesson', 'workshop', 'birthday_party',
                          'kno', 'meeting', 'personal', 'holiday_programme', 'other'
                        )),
  start_at              TIMESTAMPTZ NOT NULL,
  end_at                TIMESTAMPTZ NOT NULL,
  location              TEXT,
  notes                 TEXT,
  -- The coach this appointment is assigned to. NULL = anyone / tenant-wide.
  assigned_coach_id     UUID REFERENCES coaches(id) ON DELETE SET NULL,
  -- Optional links for private lessons / parties — to the family + a specific kid
  related_family_id     UUID REFERENCES families(id) ON DELETE SET NULL,
  related_student_id    UUID REFERENCES students(id) ON DELETE SET NULL,
  -- How many minutes before start to fire an alert. NULL = no alert.
  alert_minutes_before  INT CHECK (alert_minutes_before IS NULL OR alert_minutes_before >= 0),
  fee                   NUMERIC(10,2),
  paid                  BOOLEAN DEFAULT FALSE,
  status                TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
                          'scheduled', 'completed', 'cancelled', 'no_show'
                        )),
  created_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_at >= start_at)
);

CREATE INDEX IF NOT EXISTS idx_appts_tenant ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appts_when ON appointments(tenant_id, start_at);
CREATE INDEX IF NOT EXISTS idx_appts_coach ON appointments(assigned_coach_id, start_at) WHERE assigned_coach_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appts_family ON appointments(related_family_id) WHERE related_family_id IS NOT NULL;

-- Updated_at trigger (reuses the existing helper)
DROP TRIGGER IF EXISTS appointments_updated_at ON appointments;
CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_appointments ON appointments;
CREATE POLICY tenant_isolation_appointments ON appointments
  USING (tenant_id = current_tenant_id());

-- ----------------------------------------------------------------------------
-- Seed a handful of upcoming appointments so the calendar isn't empty
-- ----------------------------------------------------------------------------

WITH bsc AS (SELECT id FROM tenants WHERE slug = 'bigstarcircus'),
rhett AS (SELECT id FROM coaches WHERE full_name = 'Rhett Morrow' AND tenant_id = (SELECT id FROM bsc) LIMIT 1)
INSERT INTO appointments (tenant_id, title, type, start_at, end_at, location, notes, assigned_coach_id, alert_minutes_before, fee, status)
SELECT (SELECT id FROM bsc), data.title, data.type,
       data.start_at::TIMESTAMPTZ, data.end_at::TIMESTAMPTZ,
       data.location, data.notes,
       CASE WHEN data.assigned = 'rhett' THEN (SELECT id FROM rhett) ELSE NULL END,
       data.alert_min, data.fee, 'scheduled'
FROM (VALUES
  -- Wed evening — private lesson
  ('Private lesson — Lily Chen (aerial)', 'private_lesson',
   '2026-05-13 18:30+10', '2026-05-13 19:30+10',
   'Big Star Studio · Molendinar', 'Working on crucifix sequence', 'rhett', 30, 60.00),

  -- Sat — Spring Fair show (existing booking in emails)
  ('Holy Spirit Spring Fair show', 'show',
   '2026-05-17 11:00+10', '2026-05-17 11:45+10',
   'Holy Spirit School, Mudgeeraba', 'Roving entertainment + balloon — bring backup speaker', 'rhett', 120, 350.00),

  -- Sat afternoon — Mudgeeraba Street Party
  ('Mudgeeraba Street Party & Parade', 'show',
   '2026-05-17 14:00+10', '2026-05-17 17:00+10',
   'Mudgeeraba town centre', 'Set: stilts + roving balloon + parade walk. Bump-in 1pm. See email from events@theeventsagency.com.au', 'rhett', 180, 800.00),

  -- KNO night
  ('Kids Night Out — 30 May', 'kno',
   '2026-05-30 18:00+10', '2026-05-30 21:00+10',
   'Big Star Studio · Molendinar', 'Theme: Superhero Circus. Need parent helper for sign-in.', 'rhett', 1440, NULL),

  -- Private lesson next week
  ('Private lesson — Arjun Iyer (trainee prep)', 'private_lesson',
   '2026-05-15 17:00+10', '2026-05-15 18:00+10',
   'Big Star Studio · Molendinar', 'Show Programme audition piece', 'rhett', 30, 60.00),

  -- Birthday party booking
  ('Sophie’s 8th birthday party', 'birthday_party',
   '2026-05-18 10:00+10', '2026-05-18 12:00+10',
   'Big Star Studio · Molendinar', 'Sophie M, 8 kids, balloon twisting + circus games. $250 paid deposit.', 'rhett', 120, 500.00),

  -- Team meeting
  ('Coaches monthly meeting', 'meeting',
   '2026-05-20 09:00+10', '2026-05-20 10:00+10',
   'Big Star Studio · Molendinar', 'Term 2 mid-point review, payroll Q&A', NULL, 30, NULL),

  -- Personal (gym)
  ('Personal — Gym', 'personal',
   '2026-05-14 06:00+10', '2026-05-14 07:00+10',
   'Tribe Gold Coast', 'Don''t book over this slot', NULL, 15, NULL)
) AS data(title, type, start_at, end_at, location, notes, assigned, alert_min, fee)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- End of migration 004
-- ============================================================================
