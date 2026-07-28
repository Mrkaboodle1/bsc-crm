-- Big Star Books — Repeating (recurring) invoices, like Xero's.
-- A template that auto-creates a real invoice every week/fortnight/month.
-- Lines are stored as JSON on the template; the generator turns them into a
-- real bs_invoices + bs_invoice_lines record on each run.

create table if not exists public.bs_repeating_invoices (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null,
  contact_name   text,
  contact_email  text,
  reference      text,
  amounts_are    text not null default 'exclusive',
  lines          jsonb not null default '[]'::jsonb,
  frequency      text not null default 'weekly' check (frequency in ('weekly','fortnightly','monthly')),
  due_days       int not null default 7,
  next_date      date not null,
  end_date       date,
  mode           text not null default 'draft' check (mode in ('draft','approve','send')),
  active         boolean not null default true,
  last_generated date,
  created_at     timestamptz not null default now()
);

create index if not exists bs_repeating_tenant_idx on public.bs_repeating_invoices (tenant_id, active);
create index if not exists bs_repeating_next_idx on public.bs_repeating_invoices (next_date) where active;

alter table public.bs_repeating_invoices enable row level security;
-- No policies: service-role (server API + cron) only.
