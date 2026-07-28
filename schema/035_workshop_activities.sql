-- ============================================================================
-- BSC CRM — Migration 035: School Holiday Workshop activities + running order
-- ============================================================================
-- 1. workshop_activities    — a reusable LIBRARY of craft / workshop activities,
--                             each with an image + a demo video link. Coaches
--                             can add, edit, delete and upload their own.
-- 2. workshop_running_order — a per-day, drag-and-drop schedule. Every workshop
--                             day can have its OWN running order (times +
--                             activities), fully editable by coaches.
-- Plus a public 'workshop-media' storage bucket so coaches can upload their own
-- photos & short videos for each activity.
-- Safe to run as-is (idempotent). Seeds the activity library + sets each listed
-- holiday day's craft at the bottom.
-- ============================================================================

-- ── 1. Activity library ──────────────────────────────────────────────────
create table if not exists public.workshop_activities (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  title       text not null,
  description text,
  icon        text default '🎪',
  image_url   text,
  video_url   text,
  source_url  text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists workshop_activities_tenant on public.workshop_activities (tenant_id);

alter table public.workshop_activities enable row level security;
drop policy if exists workshop_activities_tenant on public.workshop_activities;
create policy workshop_activities_tenant on public.workshop_activities for all to authenticated
  using (tenant_id = current_tenant_id()
         and coalesce((select role from public.users where id = auth.uid()), '') in ('owner','manager','coach','support'))
  with check (tenant_id = current_tenant_id());

-- ── 2. Per-day running order ─────────────────────────────────────────────
create table if not exists public.workshop_running_order (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  workshop_id uuid not null references public.holiday_workshops(id) on delete cascade,
  time_label  text not null default '',
  activity    text not null default '',
  activity_id uuid references public.workshop_activities(id) on delete set null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists workshop_running_order_ws on public.workshop_running_order (workshop_id);

alter table public.workshop_running_order enable row level security;
drop policy if exists workshop_running_order_tenant on public.workshop_running_order;
create policy workshop_running_order_tenant on public.workshop_running_order for all to authenticated
  using (tenant_id = current_tenant_id()
         and coalesce((select role from public.users where id = auth.uid()), '') in ('owner','manager','coach','support'))
  with check (tenant_id = current_tenant_id());

-- ── 3. Public media bucket for activity photos & short videos ────────────
insert into storage.buckets (id, name, public) values ('workshop-media', 'workshop-media', true)
  on conflict (id) do nothing;

drop policy if exists workshop_media_read on storage.objects;
create policy workshop_media_read on storage.objects for select to public
  using (bucket_id = 'workshop-media');
drop policy if exists workshop_media_insert on storage.objects;
create policy workshop_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'workshop-media');
drop policy if exists workshop_media_update on storage.objects;
create policy workshop_media_update on storage.objects for update to authenticated
  using (bucket_id = 'workshop-media');
drop policy if exists workshop_media_delete on storage.objects;
create policy workshop_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'workshop-media');

-- ── 4. Seed the activity library (only if it's still empty) ──────────────
insert into public.workshop_activities (tenant_id, title, description, icon, video_url, source_url, sort_order)
select t.id, v.title, v.description, v.icon, v.video_url, v.source_url, v.sort_order
from (select id from public.tenants order by created_at limit 1) t,
(values
  ('Hula hoop making',        'Make your own hula hoop.',                                   '🪀', 'https://l1nk.dev/z1oxy4h',                                                              'https://l1nk.dev/z1oxy4h',                                                              10),
  ('3D zebra craft',          'Build a 3D paper zebra.',                                    '🦓', 'https://l1nq.com/fyequ2l',                                                              'https://l1nq.com/fyequ2l',                                                              20),
  ('Juggling ball making',    'Make your own juggling balls.',                              '🤹', 'https://l1nq.com/4bds7fp',                                                              'https://l1nq.com/4bds7fp',                                                              30),
  ('Colour-in parent card',   'Decorate a card to take home to a parent.',                  '💌', 'https://sl1nk.com/4t9qfbt',                                                             'https://sl1nk.com/4t9qfbt',                                                             40),
  ('Balloon animals',         'Twist balloon dogs, swords, hats & flowers.',                '🎈', 'https://www.youtube.com/watch?v=5VghtogFNqg',                                           'https://www.youtube.com/watch?v=5VghtogFNqg',                                           50),
  ('Face painting',           'Coach Alley face-paints kids while the rest do more balloons.','🎨', null,                                                                                   null,                                                                                    60),
  ('Peg puppet making + show','Make puppets from wooden laundry pegs, then a puppet show.',  '🎭', 'https://l1nq.com/5ulghbv',                                                              'https://l1nq.com/5ulghbv',                                                              70),
  ('Clown tie making',        'Make a big clown tie.',                                      '👔', 'https://au.pinterest.com/pin/597430706860455724/',                                      'https://au.pinterest.com/pin/597430706860455724/',                                      80),
  ('Clown shoe making',       'Make giant clown shoes.',                                    '👞', 'https://pt.pinterest.com/pin/1009087860238285504/',                                     'https://pt.pinterest.com/pin/1009087860238285504/',                                     90),
  ('Decorate clown glasses',  'Decorate the orange clown glasses.',                         '🤓', null,                                                                                   null,                                                                                    100),
  ('Spaghetti towers',        'Build towers with spaghetti & packing peanuts.',             '🍝', 'https://sl1nk.com/vaan8bd',                                                             'https://sl1nk.com/vaan8bd',                                                             110),
  ('Clown mask',              'Make a clown mask.',                                         '🎭', 'https://au.pinterest.com/pin/855472891764166004/',                                      'https://au.pinterest.com/pin/855472891764166004/',                                      120),
  ('Colour-in cap',           'Colour your own cap.',                                       '🧢', 'https://www.cleverpatch.com.au/ideas/by-occasion/australia-day/australian-caps',        'https://www.cleverpatch.com.au/ideas/by-occasion/australia-day/australian-caps',        130)
) as v(title, description, icon, video_url, source_url, sort_order)
where not exists (
  select 1 from public.workshop_activities
  where tenant_id = (select id from public.tenants order by created_at limit 1)
);

-- ── 5. Set each listed holiday day's craft activity ──────────────────────
update public.holiday_workshops h set activity = c.activity
from (values
  ('2026-06-29','Hula hoop making + 3D zebra craft'),
  ('2026-06-30','Juggling ball making + colour-in parent card'),
  ('2026-07-01','Balloon animals + face painting (Coach Alley)'),
  ('2026-07-02','Peg puppet making + puppet show'),
  ('2026-07-03','Clown tie making + clown shoe making + decorate clown glasses'),
  ('2026-07-07','Spaghetti towers + clown mask'),
  ('2026-07-08','Balloon animals + face painting (Coach Alley)'),
  ('2026-07-09','Colour-in cap + parent card'),
  ('2026-07-10','Hula hoop making + 3D zebra craft')
) as c(d, activity)
where h.tenant_id = (select id from public.tenants order by created_at limit 1)
  and h.date::text = c.d;
