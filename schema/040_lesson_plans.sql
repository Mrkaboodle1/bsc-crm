-- ============================================================================
-- BSC CRM — Migration 040: private-lesson plans
-- ============================================================================
-- One plan per private lesson per student per date. Coaches record what they
-- did + the child's progress + next focus, week to week. Editable, deletable,
-- downloadable (PDF) and emailable to the parent. Coach-accessible.
-- ============================================================================

create table if not exists public.lesson_plans (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  coach_id    uuid references public.coaches(id) on delete set null,
  date        date not null,
  title       text,
  did         text,         -- what we worked on
  progress    text,         -- how they're going
  next_focus  text,         -- next focus / homework
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists lesson_plans_student on public.lesson_plans (student_id, date desc);

alter table public.lesson_plans enable row level security;
drop policy if exists lesson_plans_tenant on public.lesson_plans;
create policy lesson_plans_tenant on public.lesson_plans for all to authenticated
  using (tenant_id = current_tenant_id()
         and coalesce((select role from public.users where id = auth.uid()), '') in ('owner','manager','coach','support'))
  with check (tenant_id = current_tenant_id());
