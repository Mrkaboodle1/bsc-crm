-- ============================================================================
-- BSC CRM — Migration 041: student media (coaching photos & videos)
-- ============================================================================
-- Photos & videos a coach captures of a student in class / private lessons, to
-- review technique (incl. slow-motion playback) and send to the parent.
-- Files live in the public 'workshop-media' storage bucket. Coach-accessible.
-- ============================================================================

create table if not exists public.student_media (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  url         text not null,
  kind        text not null default 'photo' check (kind in ('photo','video')),
  caption     text,
  created_at  timestamptz not null default now()
);
create index if not exists student_media_student on public.student_media (student_id, created_at desc);

alter table public.student_media enable row level security;
drop policy if exists student_media_tenant on public.student_media;
create policy student_media_tenant on public.student_media for all to authenticated
  using (tenant_id = current_tenant_id()
         and coalesce((select role from public.users where id = auth.uid()), '') in ('owner','manager','coach','support'))
  with check (tenant_id = current_tenant_id());
