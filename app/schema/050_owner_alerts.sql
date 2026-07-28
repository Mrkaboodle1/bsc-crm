-- Booking-watcher: owner alerts (in-CRM 🔔 feed) + integration cursors.
-- The /api/cron/booking-watch job checks Stripe (paid SHW/KNO) and Tectonic forms
-- (free trials) every few minutes. Each genuinely-new one is recorded here AND
-- pushed to Telegram. integration_state holds a "last seen" cursor per source so
-- the same booking is never alerted twice. Service-role only (RLS on, no policies).

create table if not exists public.owner_alerts (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null,
  kind        text not null,                 -- 'booking' | 'kno' | 'trial' | 'payment' | 'other'
  title       text not null,
  body        text,
  source      text,                          -- 'stripe' | 'tectonic'
  ref         text,                          -- source id (stripe charge id / form submission id)
  amount      numeric(12,2),
  meta        jsonb,
  sent_telegram boolean not null default false,
  created_at  timestamptz not null default now(),
  read_at     timestamptz,
  unique (tenant_id, source, ref)
);
create index if not exists owner_alerts_tenant_idx on public.owner_alerts (tenant_id, created_at desc);

create table if not exists public.integration_state (
  tenant_id   uuid not null,
  key         text not null,
  value       text,
  updated_at  timestamptz not null default now(),
  primary key (tenant_id, key)
);

alter table public.owner_alerts enable row level security;
alter table public.integration_state enable row level security;
