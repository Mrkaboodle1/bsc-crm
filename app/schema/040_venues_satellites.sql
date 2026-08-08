-- ═══════════════════════════════════════════════════════════════════════
--  BigStar Circus — SATELLITE INFRASTRUCTURE
--  Run once in the Supabase SQL editor. Safe to re-run (idempotent).
--
--  Why: today every class, workshop and enrolment belongs to "the studio"
--  because there is only one. From Term 1 2027 there are several — Ormeau,
--  Helensvale, Coomera and so on. Everything that happens in the business
--  needs to know WHERE it happened, or the rolls, money and reporting all
--  blur into one pile.
-- ═══════════════════════════════════════════════════════════════════════

-- 1 ── The venues themselves ────────────────────────────────────────────
create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,                    -- "BigStar Molendinar", "BigStar Ormeau"
  slug text not null,                    -- molendinar, ormeau  (used in web links)
  status text not null default 'active'  -- planned | active | paused | closed
    check (status in ('planned','active','paused','closed')),
  is_home boolean not null default false,-- the main studio
  address text,
  suburb text,
  postcode text,
  region text,                           -- Gold Coast, Logan, Brisbane South
  opened_on date,
  -- what we learned inspecting it (feeds the venue checklist)
  ceiling_height_m numeric(4,1),
  has_storage boolean,
  hire_rate_per_hour numeric(10,2),
  venue_contact_name text,
  venue_contact_phone text,
  venue_contact_email text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, slug)
);

-- 2 ── Tag everything that happens somewhere ────────────────────────────
alter table classes           add column if not exists venue_id uuid references venues(id) on delete set null;
alter table holiday_workshops add column if not exists venue_id uuid references venues(id) on delete set null;
alter table coaches           add column if not exists home_venue_id uuid references venues(id) on delete set null;
alter table incident_reports  add column if not exists venue_id uuid references venues(id) on delete set null;
alter table leads             add column if not exists venue_id uuid references venues(id) on delete set null;
alter table families          add column if not exists venue_id uuid references venues(id) on delete set null;

create index if not exists classes_venue_idx           on classes(venue_id);
create index if not exists holiday_workshops_venue_idx on holiday_workshops(venue_id);
create index if not exists coaches_home_venue_idx      on coaches(home_venue_id);

-- 3 ── Coaches can work across more than one venue ──────────────────────
create table if not exists coach_venues (
  coach_id uuid not null references coaches(id) on delete cascade,
  venue_id uuid not null references venues(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  primary key (coach_id, venue_id)
);

-- 4 ── Create the home studio and point all existing data at it ─────────
insert into venues (tenant_id, name, slug, status, is_home, address, suburb, postcode, region, opened_on)
select t.id, 'BigStar Molendinar', 'molendinar', 'active', true,
       'Unit 1/14 Harper St, Molendinar', 'Molendinar', '4214', 'Gold Coast', '2024-07-02'
from tenants t
where not exists (select 1 from venues v where v.tenant_id = t.id and v.slug = 'molendinar');

update classes c            set venue_id = v.id from venues v
  where v.tenant_id = c.tenant_id and v.is_home and c.venue_id is null;
update holiday_workshops w  set venue_id = v.id from venues v
  where v.tenant_id = w.tenant_id and v.is_home and w.venue_id is null;
update coaches ch           set home_venue_id = v.id from venues v
  where v.tenant_id = ch.tenant_id and v.is_home and ch.home_venue_id is null;

-- 5 ── The first satellite (planned — flip to 'active' when it opens) ───
insert into venues (tenant_id, name, slug, status, address, suburb, postcode, region, ceiling_height_m, has_storage, notes)
select t.id, 'BigStar Ormeau', 'ormeau', 'planned',
       'Ormeau Community Centre, 3 Cuthbert Drive', 'Ormeau', '4208', 'Gold Coast',
       5.0, false,
       'Inspected: ~5m Youth Space suits aerial. Mon-Wed 3:30-6pm free. NO on-site storage. Banner display approved. Venue choice under review pending the meeting with Brian (council).'
from tenants t
where not exists (select 1 from venues v where v.tenant_id = t.id and v.slug = 'ormeau');

-- 6 ── Security: same tenant rule as every other table ──────────────────
alter table venues       enable row level security;
alter table coach_venues enable row level security;

drop policy if exists venues_staff on venues;
create policy venues_staff on venues for all to authenticated
  using (tenant_id = (select tenant_id from public.users where id = auth.uid()))
  with check (tenant_id = (select tenant_id from public.users where id = auth.uid()));

drop policy if exists coach_venues_staff on coach_venues;
create policy coach_venues_staff on coach_venues for all to authenticated
  using (tenant_id = (select tenant_id from public.users where id = auth.uid()))
  with check (tenant_id = (select tenant_id from public.users where id = auth.uid()));

-- Visitors need to see active venues on the public website (class picker,
-- "find your closest BigStar"). Read-only, active venues only.
drop policy if exists venues_public_read on venues;
create policy venues_public_read on venues for select to anon
  using (status = 'active');
