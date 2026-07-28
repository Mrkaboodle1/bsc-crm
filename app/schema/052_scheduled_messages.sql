-- Scheduled messages — queue an email/SMS to go out at a future time.
-- The booking-watch cron (runs every ~5 min) sends any that are due. Powers
-- free-trial follow-ups, reminders, and "send this Friday" one-offs.
-- Service-role only (RLS on, no public policies).

create table if not exists public.scheduled_messages (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null,
  send_at     timestamptz not null,
  channel     text not null default 'email',      -- 'email' | 'sms'
  to_email    text,
  to_phone    text,
  subject     text,
  body_html   text,
  body_text   text,
  context     text,                                -- human label, e.g. 'free-trial follow-up: Yurie/Lily'
  status      text not null default 'pending',     -- pending | sent | failed | cancelled
  sent_at     timestamptz,
  error       text,
  created_at  timestamptz not null default now()
);
create index if not exists scheduled_messages_due_idx on public.scheduled_messages (status, send_at);

alter table public.scheduled_messages enable row level security;
