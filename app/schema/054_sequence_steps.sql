-- Editable email sequences — lets Rhett edit the funnel emails + wait times himself
-- from the CRM (no code). The free-trial engine reads its steps from here; if empty it
-- falls back to the built-in copy. Body supports {{first_name}}. Service-role only.

create table if not exists public.sequence_steps (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null,
  sequence    text not null default 'free_trial',   -- which funnel
  step_order  int not null,                          -- 1..n
  tag         text,                                  -- ft1..ft6 (for stats)
  offset_days int not null default 0,                -- days after enrolment (0 = immediate)
  subject     text,
  body_html   text,
  active      boolean not null default true,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (tenant_id, sequence, step_order)
);
alter table public.sequence_steps enable row level security;
