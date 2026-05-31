-- ============================================================================
-- BSC CRM v1 — Migration 011: BIGSTAR StarBand™ (NFC wristband attendance)
-- ============================================================================
-- Drafted: 31 May 2026 by Jacky
-- Purpose: MVP of the StarBand kiosk — every student gets an NFC band, taps
--   it on arrival + departure, attendance is logged and stars/XP awarded.
--   Reuses the existing `students` table; adds three NFC-only columns and a
--   new `starband_sessions` table for check-in/out events. RLS open for
--   `service_role` (used by the API routes); kiosk goes via the route
--   handlers, so anon clients never touch this table directly.
-- Run order: after 010_media_assets.sql. Safe to re-run (idempotent).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- §1 — Add StarBand fields to existing students table
-- ----------------------------------------------------------------------------

ALTER TABLE students ADD COLUMN IF NOT EXISTS nfc_uid       TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS stars_total   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS xp_total      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS attendance_streak INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS students_nfc_uid_uq ON students (nfc_uid) WHERE nfc_uid IS NOT NULL;

-- ----------------------------------------------------------------------------
-- §2 — StarBand sessions (one row per arrival → departure pair)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS starband_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  nfc_uid         TEXT NOT NULL,
  checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_out_at  TIMESTAMPTZ,
  stars_awarded   INTEGER NOT NULL DEFAULT 0,
  xp_awarded      INTEGER NOT NULL DEFAULT 0,
  collected_by    TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS starband_sessions_open_idx
  ON starband_sessions (tenant_id, student_id)
  WHERE checked_out_at IS NULL;

CREATE INDEX IF NOT EXISTS starband_sessions_today_idx
  ON starband_sessions (tenant_id, checked_in_at DESC);

ALTER TABLE starband_sessions ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically (the API routes use the admin
-- client). Authenticated tenant members can read their own sessions.
DROP POLICY IF EXISTS starband_sessions_tenant_read ON starband_sessions;
CREATE POLICY starband_sessions_tenant_read ON starband_sessions
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- ----------------------------------------------------------------------------
-- §3 — Seed: a "StarBand Demo" family + 10 demo students with mock NFC UIDs
--       (students.family_id is NOT NULL — we provision the family first.)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t_id UUID;
  f_id UUID;
  demo_data RECORD;
BEGIN
  SELECT id INTO t_id FROM tenants LIMIT 1;
  IF t_id IS NULL THEN RETURN; END IF;

  SELECT id INTO f_id FROM families
   WHERE tenant_id = t_id AND family_name = 'StarBand Demo Families'
   LIMIT 1;
  IF f_id IS NULL THEN
    INSERT INTO families (tenant_id, family_name, primary_parent, lifecycle_stage, notes)
    VALUES (t_id, 'StarBand Demo Families', 'Demo Parent', 'trial',
            'Auto-created for StarBand NFC kiosk testing.')
    RETURNING id INTO f_id;
  END IF;

  FOR demo_data IN
    SELECT * FROM (VALUES
      ('Oliver',  'Demo', 'DEMO-NFC-01'),
      ('Mia',     'Demo', 'DEMO-NFC-02'),
      ('Noah',    'Demo', 'DEMO-NFC-03'),
      ('Ava',     'Demo', 'DEMO-NFC-04'),
      ('Leo',     'Demo', 'DEMO-NFC-05'),
      ('Charlie', 'Demo', 'DEMO-NFC-06'),
      ('Isla',    'Demo', 'DEMO-NFC-07'),
      ('Hugo',    'Demo', 'DEMO-NFC-08'),
      ('Zoe',     'Demo', 'DEMO-NFC-09'),
      ('Finn',    'Demo', 'DEMO-NFC-10')
    ) AS x(first_name, last_name, nfc_uid)
  LOOP
    INSERT INTO students (tenant_id, family_id, first_name, last_name, nfc_uid,
                          stars_total, xp_total, attendance_streak)
    SELECT t_id, f_id, demo_data.first_name, demo_data.last_name, demo_data.nfc_uid,
           0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM students WHERE nfc_uid = demo_data.nfc_uid);
  END LOOP;
END $$;
