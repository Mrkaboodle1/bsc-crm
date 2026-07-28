-- ============================================================================
-- BSC CRM — Migration 043: signed waivers (imported from Tectonic + ongoing)
-- ============================================================================
-- A permanent record of every signed waiver — parent, kids, medical, emergency
-- contact, consent, signature and the date signed. Linked to a family (no
-- duplicate families: the import matches by email/phone first). Owner/manager.
-- ============================================================================

create table if not exists public.signed_waivers (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  family_id     uuid references public.families(id) on delete set null,
  event_type    text not null default 'class',     -- free_trial | shw | kno | class
  parent_name   text,
  email         text,
  phone         text,
  emergency     text,                                -- emergency name & phone
  children      text,                                -- raw "name (age)" text
  medical       text,
  consent_photo boolean,
  terms_agreed  boolean,
  signature     text,
  signed_at     timestamptz,
  import_key    text,                                -- dedupe key (re-import safe)
  answers       jsonb not null default '{}'::jsonb,  -- full original row
  created_at    timestamptz not null default now(),
  unique (tenant_id, import_key)
);
create index if not exists signed_waivers_tenant on public.signed_waivers (tenant_id, signed_at desc);
create index if not exists signed_waivers_family on public.signed_waivers (family_id);

alter table public.signed_waivers enable row level security;
drop policy if exists signed_waivers_tenant on public.signed_waivers;
create policy signed_waivers_tenant on public.signed_waivers for all to authenticated
  using (tenant_id = current_tenant_id()
         and coalesce((select role from public.users where id = auth.uid()), '') in ('owner','manager'))
  with check (tenant_id = current_tenant_id());
