-- Incident & Accident Reports — ONE form, used by coaches (portal) + admin.
-- Editable, downloadable/printable (PDF), emailable. Description supports voice-to-text
-- (captured client-side). Photos/videos + Eufy camera clips attach as media[].
-- Service-role only (RLS on, no public policies) — all access via server APIs.

create table if not exists public.incident_reports (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null,
  report_no         text,                                  -- e.g. INC-20260707-01
  workshop_id       uuid,                                  -- the day it happened (nullable)
  occurred_on       date not null,
  occurred_at       time,
  location          text,
  report_type       text not null default 'incident',      -- incident | accident | injury | near_miss
  severity          text,                                  -- minor | moderate | serious
  children          text,                                  -- names of children involved
  reporter_name     text,                                  -- coach who witnessed/logged it
  description       text,                                  -- what happened (voice-to-text lands here)
  action_taken      text,                                  -- what staff did
  injury_details    text,                                  -- injuries / first aid given
  witnesses         text,
  parent_notified   boolean not null default false,
  parent_notified_details text,
  media             jsonb not null default '[]',           -- [{type:'photo'|'video',url,name}]
  eufy_evidence     jsonb not null default '[]',           -- [{clip_url,captured_at,camera}]
  status            text not null default 'open',           -- open | reviewed | closed
  created_by        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists incident_reports_tenant_idx on public.incident_reports (tenant_id, occurred_on desc);

alter table public.incident_reports enable row level security;

-- Private bucket for incident photos/videos + downloaded Eufy clips (uploaded server-side).
insert into storage.buckets (id, name, public)
values ('incident-media', 'incident-media', false)
on conflict (id) do nothing;
