-- Collect Savar database setup.
-- Paste this whole file into Supabase → SQL Editor and click Run.
-- Safe to run again: each section only creates what's missing.

-- ─────────────────────────────────────────────────────────────
-- profiles: one row per account, holding the display name.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- Row-level security (RLS): the database itself checks who may read or change each row.
alter table public.profiles enable row level security;

drop policy if exists "profiles: logged-in can read" on public.profiles;
create policy "profiles: logged-in can read" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Create the profile automatically when someone signs up,
-- using the display name sent with the sign-up form.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Friend'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- captures: every animal someone has captured.
-- SOS captures are visible to everyone logged in; Collect captures
-- only to the person who captured them.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  photo_path text not null,
  breed text,
  mode text not null check (mode in ('collect', 'sos')),
  need text check (need in ('food', 'water', 'vet', 'owner')),
  lat double precision not null,
  lng double precision not null,
  address text,
  created_at timestamptz not null default now(),
  helped_at timestamptz,
  helped_by uuid references public.profiles (id),
  -- SOS captures always say what they need; Collect captures never do.
  constraint captures_need_matches_mode check (
    (mode = 'sos' and need is not null) or (mode = 'collect' and need is null)
  )
);

create index if not exists captures_created_at_idx on public.captures (created_at desc);

alter table public.captures enable row level security;

drop policy if exists "captures: read sos or own" on public.captures;
create policy "captures: read sos or own" on public.captures
  for select to authenticated using (mode = 'sos' or user_id = auth.uid());

-- You can only add captures as yourself, and they always start un-helped.
drop policy if exists "captures: insert own" on public.captures;
create policy "captures: insert own" on public.captures
  for insert to authenticated
  with check (user_id = auth.uid() and helped_at is null and helped_by is null);

-- You can delete your own captures (this also removes an SOS pin from everyone's map).
drop policy if exists "captures: delete own" on public.captures;
create policy "captures: delete own" on public.captures
  for delete to authenticated using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- photos bucket: capture, lost-pet, and sighting photos.
-- Public read (so pins can show images by URL); uploads only into
-- your own folder: photos/{your user id}/...
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

drop policy if exists "photos: upload into own folder" on storage.objects;
create policy "photos: upload into own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Deleting a photo needs to see it first, so both rules are limited to your own folder.
drop policy if exists "photos: read own folder" on storage.objects;
create policy "photos: read own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "photos: delete from own folder" on storage.objects;
create policy "photos: delete from own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────
-- mark_helped: anyone logged in can mark an SOS capture helped.
-- There is no update rule on captures, so this function is the only
-- way to change one, and it only touches helped_at / helped_by.
-- ─────────────────────────────────────────────────────────────
create or replace function public.mark_helped(capture_id uuid)
returns public.captures
language plpgsql
security definer set search_path = ''
as $$
declare
  result public.captures;
begin
  if auth.uid() is null then
    raise exception 'Not logged in';
  end if;

  update public.captures
  set helped_at = now(), helped_by = auth.uid()
  where id = capture_id and mode = 'sos' and helped_at is null
  returning * into result;

  if result.id is null then
    raise exception 'Not an SOS capture that still needs help';
  end if;
  return result;
end;
$$;

revoke execute on function public.mark_helped(uuid) from public, anon;
grant execute on function public.mark_helped(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- lost_pets: an owner's report of a missing pet.
-- Everyone logged in can read them (that's how the nearby alert finds them);
-- only the owner can file one and later mark it found.
-- No last-seen place (null lat/lng) means the alert goes to everyone.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.lost_pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  photo_path text not null,
  description text not null check (length(trim(description)) > 0),
  last_seen_lat double precision,
  last_seen_lng double precision,
  last_seen_address text,
  status text not null default 'open' check (status in ('open', 'found')),
  created_at timestamptz not null default now(),
  found_at timestamptz,
  -- A last-seen place has both coordinates or neither.
  constraint lost_pets_place_complete check ((last_seen_lat is null) = (last_seen_lng is null))
);

create index if not exists lost_pets_open_idx on public.lost_pets (created_at desc) where status = 'open';

alter table public.lost_pets enable row level security;

drop policy if exists "lost_pets: logged-in can read" on public.lost_pets;
create policy "lost_pets: logged-in can read" on public.lost_pets
  for select to authenticated using (true);

-- You can only file reports as yourself, and they always start open.
drop policy if exists "lost_pets: insert own" on public.lost_pets;
create policy "lost_pets: insert own" on public.lost_pets
  for insert to authenticated
  with check (owner_id = auth.uid() and status = 'open' and found_at is null);

-- Only the owner can change their report (that's how it gets marked found).
drop policy if exists "lost_pets: update own" on public.lost_pets;
create policy "lost_pets: update own" on public.lost_pets
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
