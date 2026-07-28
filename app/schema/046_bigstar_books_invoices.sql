-- Big Star Books — Stage 1: make & send invoices.
-- Service-role only (RLS on, no public policies) — all access goes through the
-- guarded /api/finance/invoices route using the service-role client.

create table if not exists public.bs_invoices (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null,
  number        text not null,
  contact_name  text,
  contact_email text,
  issue_date    date not null default current_date,
  due_date      date,
  status        text not null default 'draft' check (status in ('draft','sent','paid','void')),
  notes         text,
  subtotal      numeric(12,2) not null default 0,
  gst           numeric(12,2) not null default 0,
  total         numeric(12,2) not null default 0,
  sent_at       timestamptz,
  paid_at       timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists public.bs_invoice_lines (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.bs_invoices(id) on delete cascade,
  tenant_id   uuid not null,
  description text,
  qty         numeric(12,2) not null default 1,
  unit_price  numeric(12,2) not null default 0,
  gst         boolean not null default true,
  amount      numeric(12,2) not null default 0,
  sort        int not null default 0
);

create index if not exists bs_invoices_tenant_idx on public.bs_invoices (tenant_id, created_at desc);
create index if not exists bs_invoice_lines_invoice_idx on public.bs_invoice_lines (invoice_id);

alter table public.bs_invoices enable row level security;
alter table public.bs_invoice_lines enable row level security;
-- No policies on purpose: only the service-role key (server API) can read/write.
