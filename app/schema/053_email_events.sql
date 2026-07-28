-- Email statistics — captures every delivery/open/click/bounce from Resend so the CRM
-- can show Tectonic-style stats per email. Populated by /api/webhooks/resend.
-- Service-role only (RLS on, no public policies).

create table if not exists public.email_events (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid,
  resend_id   text,                        -- Resend email id
  event_type  text not null,               -- sent | delivered | opened | clicked | bounced | complained | delivery_delayed
  tag         text,                         -- which email/campaign (e.g. 'ft1'..'ft6', 'shw-welcome')
  recipient   text,
  subject     text,
  link        text,                         -- clicked link (for click events)
  occurred_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists email_events_tag_idx on public.email_events (tag, event_type);
create index if not exists email_events_resend_idx on public.email_events (resend_id);
create index if not exists email_events_recipient_idx on public.email_events (lower(recipient));

alter table public.email_events enable row level security;
