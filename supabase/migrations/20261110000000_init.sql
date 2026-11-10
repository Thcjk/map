-- Grundschema für Konto und Cloud-Sync.
-- Ausführen im Supabase-Dashboard unter «SQL Editor» (oder mit der Supabase CLI).
-- Alle Tabellen haben Row Level Security: Jede Person sieht nur ihre eigenen Daten.

create table public.tours (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default '',
  -- Planung, Geometrie und Etappenplan als JSON (wie lokal in IndexedDB)
  data jsonb not null,
  distance real not null default 0,
  ascent real not null default 0,
  descent real not null default 0,
  duration real not null default 0,
  is_public boolean not null default false,
  deleted boolean not null default false,
  -- Zeitpunkt der letzten Änderung auf dem Gerät (ms), für «letzte Änderung gewinnt»
  client_updated_at bigint not null,
  -- Zeitpunkt auf dem Server, Cursor für inkrementelles Abgleichen
  server_updated_at timestamptz not null default now()
);

create table public.collections (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default '',
  tour_ids uuid[] not null default '{}',
  deleted boolean not null default false,
  client_updated_at bigint not null,
  server_updated_at timestamptz not null default now()
);

create index tours_user_sync on public.tours (user_id, server_updated_at);
create index collections_user_sync on public.collections (user_id, server_updated_at);

-- server_updated_at bei jeder Änderung neu setzen
create function public.touch_server_updated_at() returns trigger
language plpgsql as $$
begin
  new.server_updated_at := now();
  return new;
end;
$$;

create trigger tours_touch before insert or update on public.tours
  for each row execute function public.touch_server_updated_at();
create trigger collections_touch before insert or update on public.collections
  for each row execute function public.touch_server_updated_at();

alter table public.tours enable row level security;
alter table public.collections enable row level security;

create policy "Eigene Touren lesen" on public.tours for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Eigene Touren anlegen" on public.tours for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Eigene Touren ändern" on public.tours for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Eigene Touren löschen" on public.tours for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "Eigene Sammlungen lesen" on public.collections for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Eigene Sammlungen anlegen" on public.collections for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Eigene Sammlungen ändern" on public.collections for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Eigene Sammlungen löschen" on public.collections for delete to authenticated
  using (user_id = (select auth.uid()));

-- Öffentlich geteilte Touren: nur abrufbar, wer die ID (den Link) kennt.
-- Es gibt bewusst keine Policy, mit der man alle öffentlichen Touren auflisten könnte.
create function public.get_public_tour(tour_id uuid)
returns table (id uuid, name text, data jsonb, distance real, ascent real, descent real, duration real)
language sql stable security definer set search_path = '' as $$
  select t.id, t.name, t.data, t.distance, t.ascent, t.descent, t.duration
  from public.tours t
  where t.id = tour_id and t.is_public and not t.deleted;
$$;

revoke all on function public.get_public_tour(uuid) from public;
grant execute on function public.get_public_tour(uuid) to anon, authenticated;

-- Für die geplante GitHub Action, die das Projekt wach hält (liest nichts Privates).
create function public.keepalive() returns text
language sql stable as $$ select 'ok'::text $$;
grant execute on function public.keepalive() to anon;
