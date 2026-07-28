-- ============================================================================
-- BSC CRM v1 — Migration 019: BigStar Kids app tables (kids_*)
-- ============================================================================
-- Drafted: 2026-06-08 by Jacky for Stacy's Parent Portal / BigStar Kids.
-- All app-specific tables the CRM lacks. Every row references the CRM's real
-- students/coaches/tenants. RLS: staff see their whole tenant; parents see ONLY
-- their own children's rows. Reference tables (categories/skills) are readable
-- tenant-wide. Stacy can ALTER columns as the app evolves.
-- Run order: after 018_kids_views.sql. Safe to re-run (idempotent).
-- ============================================================================

-- ── Skill curriculum (reference) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kids_skill_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
CREATE TABLE IF NOT EXISTS public.kids_skills (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid references public.kids_skill_categories(id) on delete set null,
  name text not null,
  level int,                       -- progression order within a category
  practice_hint text,              -- "how can I help my child improve?"
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- ── Per-kid tables ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kids_skill_grants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  skill_id uuid references public.kids_skills(id) on delete cascade,
  status text not null default 'achieved' check (status in ('learning','achieved')),
  granted_by uuid references public.coaches(id) on delete set null,
  granted_at timestamptz not null default now()
);
CREATE TABLE IF NOT EXISTS public.kids_badge_grants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  badge_key text not null,
  label text, icon text,
  awarded_by uuid references public.coaches(id) on delete set null,
  awarded_at timestamptz not null default now()
);
CREATE TABLE IF NOT EXISTS public.kids_praise_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  coach_id uuid references public.coaches(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE TABLE IF NOT EXISTS public.kids_practice_suggestions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  skill_id uuid references public.kids_skills(id) on delete set null,
  suggestion text not null,
  created_by uuid references public.coaches(id) on delete set null,
  created_at timestamptz not null default now()
);
CREATE TABLE IF NOT EXISTS public.kids_session_skills (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  skill_id uuid references public.kids_skills(id) on delete set null,
  session_date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
CREATE TABLE IF NOT EXISTS public.kids_moments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  media_url text not null,
  media_type text not null default 'photo' check (media_type in ('photo','video')),
  caption text,
  created_by uuid references public.coaches(id) on delete set null,
  created_at timestamptz not null default now()
);
CREATE TABLE IF NOT EXISTS public.kids_avatar_prefs (
  student_id uuid primary key references public.students(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
CREATE TABLE IF NOT EXISTS public.kids_game_scores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  game_key text not null,
  score int not null default 0,
  played_at timestamptz not null default now()
);
CREATE TABLE IF NOT EXISTS public.kids_streak (
  student_id uuid primary key references public.students(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  star_energy int not null default 5,        -- regenerates daily (no anxious streaks)
  last_active date,
  updated_at timestamptz not null default now()
);

-- ── RLS: staff (tenant) + parent (own kids) ────────────────────────────────
DO $$
DECLARE tbl text;
  per_kid text[] := ARRAY['kids_skill_grants','kids_badge_grants','kids_praise_notes','kids_practice_suggestions','kids_session_skills','kids_moments','kids_avatar_prefs','kids_game_scores','kids_streak'];
  ref_tbl text[] := ARRAY['kids_skill_categories','kids_skills'];
BEGIN
  -- Reference tables: tenant-wide read/write within tenant.
  FOREACH tbl IN ARRAY ref_tbl LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_tenant', tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I USING (tenant_id = current_tenant_id())', tbl || '_tenant', tbl);
  END LOOP;
  -- Per-kid tables: staff see whole tenant; parents read their own children.
  FOREACH tbl IN ARRAY per_kid LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_tenant', tbl);
    EXECUTE format($f$CREATE POLICY %I ON public.%I USING (tenant_id = current_tenant_id() AND coalesce((SELECT role FROM public.users WHERE id = auth.uid()), '') IN ('owner','manager','coach','support'))$f$, tbl || '_tenant', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_parent_read', tbl);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (student_id IN (SELECT s.id FROM public.students s JOIN public.families f ON f.id = s.family_id WHERE f.parent_user_id = auth.uid()))$f$, tbl || '_parent_read', tbl);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS kids_skill_grants_student_idx ON public.kids_skill_grants(student_id);
CREATE INDEX IF NOT EXISTS kids_badge_grants_student_idx ON public.kids_badge_grants(student_id);
CREATE INDEX IF NOT EXISTS kids_praise_notes_student_idx ON public.kids_praise_notes(student_id);
CREATE INDEX IF NOT EXISTS kids_moments_student_idx ON public.kids_moments(student_id);
CREATE INDEX IF NOT EXISTS kids_game_scores_student_idx ON public.kids_game_scores(student_id);

-- ── Seed the real BSC skill curriculum (first tenant, once) ────────────────
DO $$
DECLARE t_id uuid; gym uuid; aer uuid; jug uuid; hoop uuid; stick uuid; str uuid; perf uuid;
BEGIN
  SELECT id INTO t_id FROM public.tenants ORDER BY created_at LIMIT 1;
  IF t_id IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.kids_skill_categories WHERE tenant_id = t_id) THEN RETURN; END IF;

  INSERT INTO public.kids_skill_categories (tenant_id, name, sort) VALUES
    (t_id,'Gymnastics & Acro',1) RETURNING id INTO gym;
  INSERT INTO public.kids_skill_categories (tenant_id, name, sort) VALUES (t_id,'Aerial',2) RETURNING id INTO aer;
  INSERT INTO public.kids_skill_categories (tenant_id, name, sort) VALUES (t_id,'Juggling',3) RETURNING id INTO jug;
  INSERT INTO public.kids_skill_categories (tenant_id, name, sort) VALUES (t_id,'Aerial Hoop / Lyra',4) RETURNING id INTO hoop;
  INSERT INTO public.kids_skill_categories (tenant_id, name, sort) VALUES (t_id,'Flower / Devil Stick',5) RETURNING id INTO stick;
  INSERT INTO public.kids_skill_categories (tenant_id, name, sort) VALUES (t_id,'Strength & Conditioning',6) RETURNING id INTO str;
  INSERT INTO public.kids_skill_categories (tenant_id, name, sort) VALUES (t_id,'Performance & Clowning',7) RETURNING id INTO perf;

  INSERT INTO public.kids_skills (tenant_id, category_id, name, level, practice_hint, sort) VALUES
    (t_id,gym,'Pre-Conditioning',0,'Practice hollow holds and tuck-ups at home.',1),
    (t_id,gym,'Level 1',1,'Forward rolls and bridges on a soft surface.',2),
    (t_id,gym,'Level 2',2,'Cartwheels both sides, handstand against a wall.',3),
    (t_id,gym,'Level 3',3,'Round-offs and handstand holds.',4),
    (t_id,gym,'Level 4',4,'Walkovers and limber drills with supervision.',5),
    (t_id,gym,'Level 5',5,'Back-handspring conditioning.',6),
    (t_id,gym,'Performance Troupe',6,'Routine polish and showmanship.',7),
    (t_id,aer,'Silks — Foundations',1,'Grip strength: dead hangs from a bar.',1),
    (t_id,aer,'Silks — Climbs & Wraps',2,'Practice footlocks and basic climbs.',2),
    (t_id,aer,'Trapeze — Basics',3,'Hollow body and pull-up strength.',3),
    (t_id,jug,'2-Ball',1,'Toss and catch one ball in an arc, both hands.',1),
    (t_id,jug,'3-Ball Cascade',2,'Practice the cascade pattern slowly over a bed.',2),
    (t_id,jug,'Tricks & Patterns',3,'Columns, reverse cascade.',3),
    (t_id,hoop,'Hoop — Foundations',1,'Core and grip strength.',1),
    (t_id,hoop,'Hoop — Poses & Spins',2,'Practice pointed toes and posture.',2),
    (t_id,stick,'Flower Stick — Basics',1,'Tick-tocks with the control sticks.',1),
    (t_id,stick,'Flower Stick — Tricks',2,'Half-flips and propellers.',2),
    (t_id,str,'Flexibility',1,'Daily gentle stretching — splits progress.',1),
    (t_id,str,'Strength',2,'Hollow holds, planks, superman holds.',2),
    (t_id,perf,'Stage Confidence',1,'Practice a short act for family at home.',1),
    (t_id,perf,'Character & Clowning',2,'Big expressions, slow movements.',2);
END $$;
