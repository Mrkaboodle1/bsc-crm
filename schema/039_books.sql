-- ============================================================================
-- BSC CRM — Migration 039: Big Star Books (bookkeeping ledger)
-- ============================================================================
-- A simple, owner-only money ledger: income & expenses, each with a GST
-- component and a category. Income can be pulled from Stripe automatically.
-- This is the foundation for BAS prep, super tracking and grant accounting.
-- Owner/manager only (finance is sensitive). Safe to run as-is.
-- ============================================================================

create table if not exists public.book_transactions (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  date        date not null,
  direction   text not null check (direction in ('in','out')),   -- money in / money out
  amount      numeric(12,2) not null default 0,                  -- gross, GST-inclusive
  gst         numeric(12,2) not null default 0,                  -- GST portion of amount
  category    text,
  description text,
  party       text,                                              -- who paid / who paid to
  source      text not null default 'manual' check (source in ('manual','stripe','payroll')),
  ext_id      text,                                              -- e.g. Stripe charge id (dedupe)
  notes       text,
  created_at  timestamptz not null default now(),
  unique (tenant_id, ext_id)
);
create index if not exists book_tx_tenant_date on public.book_transactions (tenant_id, date);

alter table public.book_transactions enable row level security;
drop policy if exists book_tx_tenant on public.book_transactions;
create policy book_tx_tenant on public.book_transactions for all to authenticated
  using (tenant_id = current_tenant_id()
         and coalesce((select role from public.users where id = auth.uid()), '') in ('owner','manager'))
  with check (tenant_id = current_tenant_id());
