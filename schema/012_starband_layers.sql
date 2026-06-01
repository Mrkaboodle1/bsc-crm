-- ============================================================================
-- BSC CRM v1 — Migration 012: StarBand multi-layer identity
-- ============================================================================
-- Drafted: 31 May 2026 by Jacky
-- Purpose: Real-world fallbacks so a kid is never "stuck at the door":
--   Layer 1: wristband  (existing — students.nfc_uid)
--   Layer 2: extra bag/bottle stickers per child  (new nfc_tags table)
--   Layer 3: face-tap on the kiosk  (students.photo_url)
--   Layer 4: 4-digit PIN  (students.pin_code)
-- Plus: an "is_active" flag on each tag so a lost band can be deactivated
-- and a fresh one assigned in seconds without losing the child's history.
-- Run order: after 011_starband.sql. Safe to re-run (idempotent).
-- ============================================================================

ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS pin_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS students_pin_tenant_uq ON students (tenant_id, pin_code) WHERE pin_code IS NOT NULL;

-- ----------------------------------------------------------------------------
-- §1 — nfc_tags: many NFC bands/stickers/cards per student
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nfc_tags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  nfc_uid       TEXT NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'wristband'
                  CHECK (kind IN ('wristband', 'sticker', 'card', 'parent_card', 'other')),
  label         TEXT,                                   -- "Drink bottle", "School bag"…
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS nfc_tags_active_uid_uq
  ON nfc_tags (nfc_uid) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS nfc_tags_student_idx ON nfc_tags (student_id) WHERE is_active = TRUE;

ALTER TABLE nfc_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nfc_tags_tenant_read ON nfc_tags;
CREATE POLICY nfc_tags_tenant_read ON nfc_tags
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- ----------------------------------------------------------------------------
-- §2 — Backfill: copy each student's current nfc_uid into nfc_tags as a
--       'wristband' kind, so existing demo data keeps working immediately.
-- ----------------------------------------------------------------------------
INSERT INTO nfc_tags (tenant_id, student_id, nfc_uid, kind, label)
SELECT s.tenant_id, s.id, s.nfc_uid, 'wristband', 'Original band'
FROM students s
WHERE s.nfc_uid IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM nfc_tags t WHERE t.nfc_uid = s.nfc_uid);

-- ----------------------------------------------------------------------------
-- §3 — Seed: assign sticker tags + face placeholders + PINs to demo kids so
--       you can test all four layers end-to-end tomorrow.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
  i INT := 1;
BEGIN
  FOR rec IN SELECT s.id, s.tenant_id, s.first_name FROM students s
             WHERE s.last_name = 'Demo' AND s.nfc_uid LIKE 'DEMO-NFC-%'
             ORDER BY s.nfc_uid LOOP
    -- Extra "sticker" tag, e.g. DEMO-STK-01
    INSERT INTO nfc_tags (tenant_id, student_id, nfc_uid, kind, label)
    SELECT rec.tenant_id, rec.id, 'DEMO-STK-' || LPAD(i::TEXT, 2, '0'), 'sticker', 'Drink bottle'
    WHERE NOT EXISTS (SELECT 1 FROM nfc_tags WHERE nfc_uid = 'DEMO-STK-' || LPAD(i::TEXT, 2, '0'));
    -- 4-digit PIN (kids memorise this)
    UPDATE students SET pin_code = LPAD((1000 + i)::TEXT, 4, '0') WHERE id = rec.id AND pin_code IS NULL;
    -- Placeholder face photo (Pravatar shows a different person per seed)
    UPDATE students SET photo_url = 'https://i.pravatar.cc/240?img=' || (i * 5)::TEXT WHERE id = rec.id AND photo_url IS NULL;
    i := i + 1;
  END LOOP;
END $$;
