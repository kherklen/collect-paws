-- Collect Paw database setup.
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

-- You can only add captures as yourself, they always start un-helped, and they're
-- stamped with the real time (a backdated pin would look like it's waited longer).
drop policy if exists "captures: insert own" on public.captures;
create policy "captures: insert own" on public.captures
  for insert to authenticated
  with check (
    user_id = auth.uid() and helped_at is null and helped_by is null
    and created_at between now() - interval '1 minute' and now() + interval '1 minute'
  );

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

-- ─────────────────────────────────────────────────────────────
-- sightings: someone thinks they've seen a lost pet.
-- 'now' = a photo taken on the spot; 'report' = when, where, and a
-- required description (so the owner can rule out false alarms).
-- Only the sender and the pet's owner can see a sighting.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.sightings (
  id uuid primary key default gen_random_uuid(),
  lost_pet_id uuid not null references public.lost_pets (id) on delete cascade,
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('now', 'report')),
  photo_path text,
  seen_at timestamptz not null default now(),
  lat double precision,
  lng double precision,
  place_text text,
  description text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint sightings_kind_complete check (
    (kind = 'now' and photo_path is not null)
    or (kind = 'report' and length(trim(coalesce(description, ''))) > 0)
  )
);

create index if not exists sightings_lost_pet_idx on public.sightings (lost_pet_id, created_at desc);

alter table public.sightings enable row level security;

-- Is this lost pet mine? (A function, so the rules below can ask without
-- tripping over lost_pets' own rules.)
create or replace function public.owns_lost_pet(pet_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (select 1 from public.lost_pets where id = pet_id and owner_id = auth.uid());
$$;

-- Anyone logged in can send a sighting, as themselves, on a pet that's still lost.
drop policy if exists "sightings: insert own" on public.sightings;
create policy "sightings: insert own" on public.sightings
  for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and read_at is null
    and exists (select 1 from public.lost_pets p where p.id = lost_pet_id and p.status = 'open')
  );

drop policy if exists "sightings: read sender or owner" on public.sightings;
create policy "sightings: read sender or owner" on public.sightings
  for select to authenticated
  using (reporter_id = auth.uid() or public.owns_lost_pet(lost_pet_id));

-- The owner marks sightings read. The grants below limit updates to the
-- read_at column, so nobody can rewrite what a sighting says.
drop policy if exists "sightings: owner marks read" on public.sightings;
create policy "sightings: owner marks read" on public.sightings
  for update to authenticated
  using (public.owns_lost_pet(lost_pet_id)) with check (public.owns_lost_pet(lost_pet_id));

revoke update on public.sightings from authenticated, anon;
grant update (read_at) on public.sightings to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Additions after the final review.
-- ─────────────────────────────────────────────────────────────

-- Demo account: skips the real-photo checks, can upload from the gallery,
-- and can drop its pins anywhere. People may only set or change their own
-- display name, so nobody can make themselves a demo account.
alter table public.profiles add column if not exists is_demo boolean not null default false;

revoke insert, update on public.profiles from authenticated, anon;
grant insert (id, display_name) on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

-- The demo account itself (created by scripts/seed-demo.mjs).
update public.profiles set is_demo = true
where id in (select id from auth.users where email = 'demo@paw.test');

-- Re-identification: captures of the same animal share an animal_id.
-- A new capture starts its own animal unless the person confirms a match.
alter table public.captures add column if not exists animal text check (animal in ('cat', 'dog'));
alter table public.captures add column if not exists animal_id uuid not null default gen_random_uuid();
create index if not exists captures_animal_id_idx on public.captures (animal_id);

-- How many captures an animal has and when it was first seen, counting
-- private ones too (only the numbers, never whose or where).
create or replace function public.animal_summary(target uuid)
returns table (times_seen integer, first_seen timestamptz)
language sql
stable
security definer set search_path = ''
as $$
  select count(*)::integer, min(created_at) from public.captures where animal_id = target;
$$;

revoke execute on function public.animal_summary(uuid) from public, anon;
grant execute on function public.animal_summary(uuid) to authenticated;

-- Urgency: green (fed or fine) is a Collect capture; SOS is amber (hungry or
-- limping) or red (injured or trapped). Existing SOS captures become amber.
alter table public.captures add column if not exists urgency text;
update public.captures set urgency = case when mode = 'sos' then 'amber' else 'green' end
where urgency is null;

-- Fill in urgency when a capture is saved without one, from its mode.
create or replace function public.default_urgency()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.urgency is null then
    new.urgency := case when new.mode = 'sos' then 'amber' else 'green' end;
  end if;
  return new;
end;
$$;

drop trigger if exists captures_default_urgency on public.captures;
create trigger captures_default_urgency
  before insert on public.captures
  for each row execute function public.default_urgency();

alter table public.captures alter column urgency set not null;
alter table public.captures drop constraint if exists captures_urgency_matches_mode;
alter table public.captures add constraint captures_urgency_matches_mode check (
  (mode = 'collect' and urgency = 'green') or (mode = 'sos' and urgency in ('amber', 'red'))
);

-- ─────────────────────────────────────────────────────────────
-- comments: on SOS captures and lost-pet reports (Collect captures are private).
-- Anyone logged in can read and write them; authors delete their own; the
-- post's owner can only mark them read (that's what clears their pop-up and badge).
-- ─────────────────────────────────────────────────────────────
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  capture_id uuid references public.captures (id) on delete cascade,
  lost_pet_id uuid references public.lost_pets (id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  -- Every comment belongs to exactly one post.
  constraint comments_on_one_post check ((capture_id is null) <> (lost_pet_id is null))
);

create index if not exists comments_capture_idx on public.comments (capture_id, created_at);
create index if not exists comments_lost_pet_idx on public.comments (lost_pet_id, created_at);

alter table public.comments enable row level security;

-- Is this a post people can comment on? (SOS captures and lost-pet reports.)
create or replace function public.is_commentable(capture uuid, pet uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select case
    when capture is not null then exists (select 1 from public.captures where id = capture and mode = 'sos')
    else exists (select 1 from public.lost_pets where id = pet)
  end;
$$;

-- Is this post mine?
create or replace function public.owns_post(capture uuid, pet uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select case
    when capture is not null then exists (select 1 from public.captures where id = capture and user_id = auth.uid())
    else exists (select 1 from public.lost_pets where id = pet and owner_id = auth.uid())
  end;
$$;

drop policy if exists "comments: read on open posts" on public.comments;
create policy "comments: read on open posts" on public.comments
  for select to authenticated using (public.is_commentable(capture_id, lost_pet_id));

drop policy if exists "comments: insert own" on public.comments;
create policy "comments: insert own" on public.comments
  for insert to authenticated
  with check (author_id = auth.uid() and read_at is null and public.is_commentable(capture_id, lost_pet_id));

drop policy if exists "comments: delete own" on public.comments;
create policy "comments: delete own" on public.comments
  for delete to authenticated using (author_id = auth.uid());

drop policy if exists "comments: owner marks read" on public.comments;
create policy "comments: owner marks read" on public.comments
  for update to authenticated
  using (public.owns_post(capture_id, lost_pet_id)) with check (public.owns_post(capture_id, lost_pet_id));

revoke update on public.comments from authenticated, anon;
grant update (read_at) on public.comments to authenticated;

-- ─────────────────────────────────────────────────────────────
-- push_subscriptions: where to send phone notifications for each device.
-- Saved through save_push_subscription (a phone that changes accounts moves
-- to the new one); the server reads them with the secret key to send.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions: read own" on public.push_subscriptions;
create policy "push_subscriptions: read own" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "push_subscriptions: delete own" on public.push_subscriptions;
create policy "push_subscriptions: delete own" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not logged in';
  end if;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
end;
$$;

revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Sample content lives in its own world. Posts by demo accounts are only visible
-- to demo accounts, and demo accounts only see demo posts: testers far away get the
-- sample animals in Ulaanbaatar, and real people never see fake strays or alerts.
-- These replace the read rules defined above.
-- ─────────────────────────────────────────────────────────────

-- The demo account and its sample neighbor (created by scripts/seed-demo.mjs).
update public.profiles set is_demo = true
where id in (
  select id from auth.users
  where email in ('demo@paw.test', 'neighbor@paw.test')
);

-- Are this account and me on the same side (both demo, or both real)?
create or replace function public.same_world(other uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select coalesce((select is_demo from public.profiles where id = other), false)
       = coalesce((select is_demo from public.profiles where id = auth.uid()), false);
$$;

drop policy if exists "captures: read sos or own" on public.captures;
create policy "captures: read sos or own" on public.captures
  for select to authenticated
  using (user_id = auth.uid() or (mode = 'sos' and public.same_world(user_id)));

drop policy if exists "lost_pets: logged-in can read" on public.lost_pets;
create policy "lost_pets: logged-in can read" on public.lost_pets
  for select to authenticated using (public.same_world(owner_id));

-- Comments (reading and writing) follow their post's side too.
create or replace function public.is_commentable(capture uuid, pet uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select case
    when capture is not null then exists (
      select 1 from public.captures where id = capture and mode = 'sos' and public.same_world(user_id)
    )
    else exists (select 1 from public.lost_pets where id = pet and public.same_world(owner_id))
  end;
$$;
