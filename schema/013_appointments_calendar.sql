-- ============================================================================
-- BSC CRM — Migration 013: Appointments (the real diary calendar)
-- ============================================================================
-- Creates the `appointments` table that the rebuilt /calendar uses for every
-- non-class event: shows, performing gigs, private lessons, parties, meetings,
-- rehearsals, personal blocks. Combined with the weekly `classes`, this is
-- Rhett's paper-diary replacement.
--
-- Safe to run as-is (idempotent). No fake seed rows — starts clean.
-- ============================================================================

CREATE TABLE IF NOT EXISTS appointments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  type                  TEXT NOT NULL DEFAULT 'event' CHECK (type IN (
                          'show', 'gig', 'private_lesson', 'workshop', 'birthday_party',
                          'kno', 'meeting', 'rehearsal', 'personal', 'holiday_programme',
                          'event', 'other'
                        )),
  start_at              TIMESTAMPTZ NOT NULL,
  end_at                TIMESTAMPTZ NOT NULL,
  all_day               BOOLEAN NOT NULL DEFAULT FALSE,
  location              TEXT,
  description           TEXT,
  notes                 TEXT,
  assigned_coach_id     UUID REFERENCES coaches(id) ON DELETE SET NULL,
  related_family_id     UUID REFERENCES families(id) ON DELETE SET NULL,
  related_student_id    UUID REFERENCES students(id) ON DELETE SET NULL,
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

-- If an older appointments table already exists, make sure the new columns are present.
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS all_day BOOLEAN NOT NULL DEFAULT FALSE;

-- Widen the type check to include gig / rehearsal / event.
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_type_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_type_check CHECK (type IN (
  'show', 'gig', 'private_lesson', 'workshop', 'birthday_party',
  'kno', 'meeting', 'rehearsal', 'personal', 'holiday_programme',
  'event', 'other'
));

CREATE INDEX IF NOT EXISTS idx_appts_tenant ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appts_when ON appointments(tenant_id, start_at);
CREATE INDEX IF NOT EXISTS idx_appts_coach ON appointments(assigned_coach_id, start_at) WHERE assigned_coach_id IS NOT NULL;

DROP TRIGGER IF EXISTS appointments_updated_at ON appointments;
CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_appointments ON appointments;
CREATE POLICY tenant_isolation_appointments ON appointments
  USING (tenant_id = current_tenant_id());

-- ============================================================================
-- End of migration 013
-- ============================================================================
