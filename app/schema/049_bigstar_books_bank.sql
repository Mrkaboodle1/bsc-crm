-- Big Star Books — bank transactions + reconciliation (Stage 2 core).
-- CommBank CSV rows land here as 'needs_review'; once categorised they become
-- 'reconciled'. categorisation_rules remembers your choices so next time it
-- auto-suggests. Service-role only (RLS on, no public policies).

create table if not exists public.bank_transactions (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null,
  txn_date          date not null,
  amount            numeric(12,2) not null,
  direction         text not null check (direction in ('in','out')),
  description       text,
  balance           numeric(12,2),
  source            text not null default 'commbank_csv',
  import_key        text not null,
  status            text not null default 'needs_review' check (status in ('needs_review','reconciled')),
  category          text,
  gst               boolean not null default true,
  is_personal       boolean not null default false,
  matched_invoice_id uuid,
  note              text,
  created_at        timestamptz not null default now(),
  unique (tenant_id, import_key)
);
create index if not exists bank_txn_tenant_idx on public.bank_transactions (tenant_id, status, txn_date desc);

create table if not exists public.categorisation_rules (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null,
  match_text text not null,
  category   text not null,
  gst        boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, match_text)
);

alter table public.bank_transactions enable row level security;
alter table public.categorisation_rules enable row level security;
