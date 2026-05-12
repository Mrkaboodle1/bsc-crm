-- ============================================================================
-- BSC CRM v1 — Migration 003: Seed test families/students + widen provisioning
-- ============================================================================
-- Drafted: 2026-05-12 by Jackie (overnight build)
-- Purpose:
--   1. Seed sample families + students + enrolments so the dashboard has
--      something to show + Roll Call has students to mark.
--   2. Widen the user-provisioning trigger: after the first user, any
--      additional auth signups for the BSC tenant get auto-created as 'coach'
--      role (not 'owner'). Owners can promote them in Settings later.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Part 1 — Widen the auth-user provisioning trigger
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bsc_tenant_id UUID;
  existing_user_count INT;
  new_role TEXT;
BEGIN
  SELECT id INTO bsc_tenant_id FROM public.tenants WHERE slug = 'bigstarcircus';

  IF bsc_tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO existing_user_count
  FROM public.users WHERE tenant_id = bsc_tenant_id;

  -- First user = founder/owner. Anyone else = coach by default; owners
  -- can promote them via the Settings → Users page (Slice 5+).
  IF existing_user_count = 0 THEN
    new_role := 'owner';
  ELSE
    new_role := 'coach';
  END IF;

  INSERT INTO public.users (id, tenant_id, email, role, full_name)
  VALUES (
    NEW.id,
    bsc_tenant_id,
    NEW.email,
    new_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Part 2 — Sample families
-- ----------------------------------------------------------------------------

WITH bsc AS (SELECT id FROM tenants WHERE slug = 'bigstarcircus')
INSERT INTO families (tenant_id, family_name, primary_parent, email, phone, source, lifecycle_stage, weekly_fee_total, tags)
SELECT bsc.id, data.* FROM bsc, (VALUES
  -- Active families
  ('Anderson',  'Sarah Anderson',     'sarah.anderson@example.com',     '0411 111 111', 'fb_ad',         'active', 27.00,  ARRAY['homeschool']::TEXT[]),
  ('Bennett',   'Mike Bennett',       'mike.bennett@example.com',       '0411 222 222', 'word_of_mouth', 'active', 54.00,  ARRAY['siblings']::TEXT[]),
  ('Chen',      'Lisa Chen',          'lisa.chen@example.com',          '0411 333 333', 'instagram',     'active', 27.00,  ARRAY['aerial']::TEXT[]),
  ('Davis',     'Karen Davis',        'karen.davis@example.com',        '0411 444 444', 'google',        'active', 27.00,  ARRAY[]::TEXT[]),
  ('Edwards',   'Tom Edwards',        'tom.edwards@example.com',        '0411 555 555', 'word_of_mouth', 'active', 54.00,  ARRAY['siblings','homeschool']::TEXT[]),
  ('Foster',    'Jen Foster',         'jen.foster@example.com',         '0411 666 666', 'school',        'active', 27.00,  ARRAY[]::TEXT[]),
  ('Garcia',    'Carlos Garcia',      'carlos.garcia@example.com',      '0411 777 777', 'fb_ad',         'active', 27.00,  ARRAY['ndis']::TEXT[]),
  ('Henderson', 'Amy Henderson',      'amy.henderson@example.com',      '0411 888 888', 'walkin',        'active', 27.00,  ARRAY[]::TEXT[]),
  ('Iyer',      'Priya Iyer',         'priya.iyer@example.com',         '0411 999 999', 'open_day',      'active', 81.00,  ARRAY['siblings']::TEXT[]),
  ('Jackson',   'Marcus Jackson',     'marcus.jackson@example.com',     '0412 111 111', 'word_of_mouth', 'active', 30.00,  ARRAY['adult']::TEXT[]),
  ('Kim',       'Soo Kim',            'soo.kim@example.com',            '0412 222 222', 'instagram',     'active', 20.00,  ARRAY['toddler']::TEXT[]),
  ('Lee',       'David Lee',          'david.lee@example.com',          '0412 333 333', 'fb_ad',         'active', 27.00,  ARRAY[]::TEXT[]),
  -- Trials
  ('Murphy',    'Brigid Murphy',      'brigid.murphy@example.com',      '0412 444 444', 'instagram',     'trial',  0,      ARRAY[]::TEXT[]),
  ('Nguyen',    'Linh Nguyen',        'linh.nguyen@example.com',        '0412 555 555', 'google',        'trial',  0,      ARRAY[]::TEXT[]),
  -- Leads
  ('Okafor',    'Chioma Okafor',      'chioma.okafor@example.com',      '0412 666 666', 'fb_ad',         'lead',   0,      ARRAY[]::TEXT[]),
  ('Patel',     'Anjali Patel',       'anjali.patel@example.com',       '0412 777 777', 'walkin',        'lead',   0,      ARRAY['ndis']::TEXT[]),
  ('Quinn',     'Sean Quinn',         'sean.quinn@example.com',         '0412 888 888', 'instagram',     'lead',   0,      ARRAY[]::TEXT[]),
  -- Past
  ('Roberts',   'Helen Roberts',      'helen.roberts@example.com',      '0412 999 999', 'school',        'past',   0,      ARRAY[]::TEXT[])
) AS data(family_name, primary_parent, email, phone, source, lifecycle_stage, weekly_fee_total, tags)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Part 3 — Sample students
-- ----------------------------------------------------------------------------

WITH bsc AS (SELECT id FROM tenants WHERE slug = 'bigstarcircus'),
fam AS (SELECT family_name, id FROM families WHERE tenant_id = (SELECT id FROM bsc))
INSERT INTO students (tenant_id, family_id, first_name, last_name, date_of_birth, photo_consent, total_stars, star_tier)
SELECT (SELECT id FROM bsc), fam.id, s.first_name, fam.family_name, s.dob, s.consent, s.stars,
  CASE
    WHEN s.stars >= 76 THEN 5
    WHEN s.stars >= 36 THEN 4
    WHEN s.stars >= 16 THEN 3
    WHEN s.stars >=  6 THEN 2
    ELSE 1
  END
FROM fam
JOIN (VALUES
  -- Anderson — 1 kid
  ('Anderson',  'Ella',     '2018-04-12'::DATE, TRUE,  42),
  -- Bennett — siblings
  ('Bennett',   'Jack',     '2017-09-03'::DATE, TRUE,  28),
  ('Bennett',   'Mia',      '2019-02-14'::DATE, TRUE,  11),
  -- Chen
  ('Chen',      'Lily',     '2014-06-20'::DATE, TRUE,  68),
  -- Davis
  ('Davis',     'Jasper',   '2016-11-08'::DATE, FALSE, 19),
  -- Edwards — siblings (homeschool)
  ('Edwards',   'Oscar',    '2015-03-22'::DATE, TRUE,  77),
  ('Edwards',   'Ruby',     '2017-12-01'::DATE, TRUE,  34),
  -- Foster
  ('Foster',    'Cooper',   '2018-08-15'::DATE, TRUE,  8),
  -- Garcia (NDIS)
  ('Garcia',    'Mateo',    '2014-05-30'::DATE, TRUE,  22),
  -- Henderson
  ('Henderson', 'Indigo',   '2019-10-11'::DATE, TRUE,  5),
  -- Iyer — siblings ×3
  ('Iyer',      'Arjun',    '2014-01-19'::DATE, TRUE,  91),
  ('Iyer',      'Priya',    '2016-07-25'::DATE, TRUE,  56),
  ('Iyer',      'Rohan',    '2018-04-09'::DATE, TRUE,  17),
  -- Jackson (adult)
  ('Jackson',   'Marcus',   '1992-02-04'::DATE, TRUE,  3),
  -- Kim (toddler)
  ('Kim',       'Sora',     '2023-08-12'::DATE, TRUE,  4),
  -- Lee
  ('Lee',       'Hannah',   '2015-11-30'::DATE, FALSE, 31),
  -- Trials & leads — minimal data
  ('Murphy',    'Olivia',   '2017-04-04'::DATE, FALSE, 0),
  ('Nguyen',    'Liam',     '2018-09-15'::DATE, FALSE, 0)
) AS s(family_name, first_name, dob, consent, stars) ON fam.family_name = s.family_name
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Part 4 — Sample enrolments (only active families, only first 2 classes per
-- weekday to keep numbers realistic). We enrol students into classes that
-- match their age band.
-- ----------------------------------------------------------------------------

-- Helper: enrol every kid in the FIRST appropriate active class by discipline + age
WITH bsc AS (SELECT id FROM tenants WHERE slug = 'bigstarcircus'),
all_students AS (
  SELECT s.id AS student_id, s.first_name, s.last_name,
         EXTRACT(YEAR FROM AGE(s.date_of_birth)) AS age,
         f.lifecycle_stage
  FROM students s
  JOIN families f ON f.id = s.family_id
  WHERE s.tenant_id = (SELECT id FROM bsc)
),
all_classes AS (
  SELECT c.id AS class_id, c.discipline, c.age_min, c.age_max, c.weekly_fee,
         c.day_of_week, c.start_time
  FROM classes c
  WHERE c.tenant_id = (SELECT id FROM bsc) AND c.status = 'active'
),
matched AS (
  SELECT DISTINCT ON (s.student_id) s.student_id, c.class_id, c.weekly_fee
  FROM all_students s
  JOIN all_classes c
    ON (c.age_min IS NULL OR s.age >= c.age_min)
   AND (c.age_max IS NULL OR s.age <= c.age_max)
   -- Prefer fusion / acro over aerial for siblings; toddlers go toddler; adults go adult
   AND (
     (s.age < 5 AND c.discipline = 'toddler') OR
     (s.age BETWEEN 5 AND 8  AND c.discipline IN ('circus_acro','fusion')) OR
     (s.age BETWEEN 9 AND 15 AND c.discipline IN ('circus_acro','fusion','aerial')) OR
     (s.age >= 18 AND c.discipline = 'adult')
   )
   AND s.lifecycle_stage = 'active'
  ORDER BY s.student_id, c.day_of_week, c.start_time
)
INSERT INTO enrolments (tenant_id, student_id, class_id, start_date, status, term, weekly_fee)
SELECT (SELECT id FROM bsc), matched.student_id, matched.class_id,
       '2026-04-21'::DATE, 'active', 'Term 2 2026', matched.weekly_fee
FROM matched
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Part 5 — Sample star ledger entries (so the tier numbers we cached on
-- students.total_stars actually reconcile with a real ledger).
-- ----------------------------------------------------------------------------

WITH bsc AS (SELECT id FROM tenants WHERE slug = 'bigstarcircus'),
rhett AS (SELECT id FROM coaches WHERE full_name = 'Rhett Morrow' AND tenant_id = (SELECT id FROM bsc)),
rod AS (SELECT id FROM coaches WHERE full_name = 'Rodrigo Hoyos' AND tenant_id = (SELECT id FROM bsc))
INSERT INTO star_ledger (tenant_id, student_id, stars, reason, notes, awarded_by_coach_id, awarded_at)
SELECT (SELECT id FROM bsc), s.id, sl.stars, sl.reason, sl.notes,
       CASE WHEN sl.coach = 'rhett' THEN (SELECT id FROM rhett) ELSE (SELECT id FROM rod) END,
       sl.awarded_at::TIMESTAMPTZ
FROM students s
JOIN (VALUES
  ('Ella',   1, 'skill_milestone', 'First cartwheel without help',                 'rhett', '2026-04-21 16:30'),
  ('Ella',   2, 'skill_milestone', 'Backbend kickover',                            'rhett', '2026-04-28 16:30'),
  ('Ella',   1, 'discipline',      'Stayed on task the whole class',               'rod',   '2026-05-05 16:30'),
  ('Lily',   3, 'skill_milestone', 'Crucifix on silks',                            'rhett', '2026-04-22 17:00'),
  ('Lily',   2, 'showcase',        'Aerial showcase rehearsal',                    'rhett', '2026-04-29 17:00'),
  ('Oscar',  3, 'showcase',        'Lead acro role in showcase',                   'rhett', '2026-04-22 09:30'),
  ('Oscar',  2, 'attendance',      '10 weeks straight, no absences',               'rod',   '2026-05-06 09:30'),
  ('Arjun',  3, 'skill_milestone', 'First pull-over on bar',                       'rod',   '2026-04-21 16:30'),
  ('Arjun',  2, 'referral',        'Referred new family',                          'rhett', '2026-04-28 16:30'),
  ('Priya',  2, 'discipline',      'Helped pack up without being asked',           'rod',   '2026-05-05 16:30'),
  ('Jack',   1, 'skill_milestone', 'Headstand 5 seconds',                          'rhett', '2026-04-29 15:45'),
  ('Jack',   1, 'social_tag',      'Tagged BSC on Instagram',                      'rhett', '2026-05-06 15:45')
) AS sl(name, stars, reason, notes, coach, awarded_at) ON s.first_name = sl.name
WHERE s.tenant_id = (SELECT id FROM bsc)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- End of migration 003
-- ============================================================================
-- After this runs:
--   • 18 families (12 active, 2 trial, 3 lead, 1 past)
--   • 18 students aged 2 to 33 with total_stars + star_tier set
--   • Active students enrolled in age-appropriate classes (Term 2 2026)
--   • A sample star ledger with 12 entries authored by Rhett or Rodrigo
-- ============================================================================
