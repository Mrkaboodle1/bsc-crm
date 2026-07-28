-- ============================================================================
-- BSC CRM — Migration 042: studio playlists
-- ============================================================================
-- Coach-built, named playlists (e.g. "Tuesday Junior Aerial Showcase"). Tracks
-- are coach-uploaded audio files stored in the public 'workshop-media' bucket.
-- Plays through the studio music player. Coach-accessible.
-- NOTE: only upload music you have the right to use.
-- ============================================================================

create table if not exists public.playlists (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  name        text not null,
  tracks      jsonb not null default '[]'::jsonb,   -- [{ title, url }]
  created_at  timestamptz not null default now()
);
create index if not exists playlists_tenant on public.playlists (tenant_id);

alter table public.playlists enable row level security;
drop policy if exists playlists_tenant on public.playlists;
create policy playlists_tenant on public.playlists for all to authenticated
  using (tenant_id = current_tenant_id()
         and coalesce((select role from public.users where id = auth.uid()), '') in ('owner','manager','coach','support'))
  with check (tenant_id = current_tenant_id());
